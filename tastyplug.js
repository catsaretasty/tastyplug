/*
 Copyright (c) 2013-2015 by Olivier Houle (Fungus)
 Legacy Chat option made by Git!
 Tastymojis by Nackloose and Fungus.
 Please do not copy or modify without my permission.
 */
Array.prototype.isArray = true;
var tastyPlugShutDown;
if (typeof tastyPlugShutDown != 'undefined') tastyPlugShutDown();
(function($){
    var sock, afktime = Date.now(), pms = false, drag = false, hidevideo = false, joincd = false,
        version = '1.5.0 | stg', commands = {}, tos = {}, boothcd = false, reconnect = true, hover = false,
        room = location.pathname, lastchat, curvotes = {}, togglepm = true,
        emotes = {}, sounds = ['default','pin','meow','robot','lolping','lolbutton','skype','inception','ding','hardkick','custom'],
        settings = {
            show: true,
            autowoot: false,
            autojoin: false,
            chatmentions: false,
            joinnotifs: {toggle:false,ranks:false,friends:false,lvl1:false},
            msgs: [],
            lastPM: null,
            uipos: {'top':'54px','left':'0'},
            boothalert: false,
            boothnotify: 3,
            legacychat: false,
            histalert: false,
            mehtrack: false,
            chatimgs: false,
            emotes: false,
            hidden: false,
            mention: 0,
            customsound: '',
            /*tastymojis: false,*/
            emojitype: 'ios',
            autocheck: false,
            autolabel: false
        };
    /*function socket() {
     function loadSocket() {
     SockJS.prototype.msg = function(a){this.send(JSON.stringify(a))};
     sock = new SockJS('https://fungustime.pw:4957/socket');
     sock.onopen = function() {
     reconint = 2;
     console.log('[TastyPlug v' + version + '] Connected to socket!');
     return sock.msg({z:'censored',a:{id:API.getUser().id,username:API.getUser().username+' {S}'},r:room});
     };
     sock.onmessage = function(data) {
     data = JSON.parse(data.data);
     switch (data.z) {
     case 'cmderr':
     return Chat('error', data.e);
     case 'clientmsg':
     if (data.a.isArray) {
     if (data.a.length == 0) return Chat('error', 'Nobody meh\'d the song!');
     Chat('info', 'Logged meh stats to console (press f12 and click console tab)');
     return console.table(data.a);
     }
     if (data.beep) chatSound();
     return Chat('info', data.a);
     case 'pm':
     if (!togglepm) return sock.msg({z:'pmdisabled',fun:API.getUser().username,tid:data.user.id});
     settings.lastPM = data.user.username;
     ChatPM(data.user.username, data.m);
     chatSound();
     return;
     case 'reload':
     return commands.reset();
     case 'users':
     for (var i = 0; i < data.a.length; i++) data.a[i] = _.escape(data.a[i]);
     return Chat('info',data.a.join('<br>'));
     default:
     console.log('[TastyPlug v' + version + '] Unknown socket command');
     }
     };
     sock.onclose = function() {
     console.log('[TastyPlug v' + version + '] Disconnected from socket!');
     if (reconnect) tos.reconnect = setTimeout(function(){
     if (sock.readyState == 3) socket();
     },128000);
     };
     }
     if (typeof SockJS == 'undefined') {
     $.getScript('https://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js', loadSocket);
     } else loadSocket();
     }*/
    function startup() {
        loadSettings();
        loadUI();
        loadEvents();
        loadEmotes();
        tos.roomcheck = setInterval(function(){
            if (location.pathname != room) {
                clearInterval(tos.roomcheck);
                a = function(){
                    if ($('#room-loader').length) setTimeout(a,200);
                    else $.getScript('https://tastyplug.tastycat.org/tastyplug.js');
                };
                a();
            }
        },200);
        if (room == '/tastycat') eta();
        if (settings.autowoot) woot();
        if (settings.autojoin) {
            afkCheck();
            if (!getLocked() && API.getWaitListPosition() == -1 && API.getDJ() && API.getDJ().id != API.getUser().id) join();
        }
        legacyChat.toggle(settings.legacychat);
        /*if (tastyMojis) tastyMojis.toggle(settings.tastymojis);*/
        /*socket();*/
        Chat('init', 'TastyPlug v' + version + ' now rising from the dead.');
        console.log('[TastyPlug v' + version + '] now rising from the dead.');
    }
    function loadSettings() {
        var a = JSON.parse(localStorage.getItem('tastyPlugSettings'));
        if (a) {
            for (var i in settings) {
                if (typeof a[i] != 'undefined') {
                    if (a[i] !== null && a[i].isArray && settings[i] !== null && settings[i].isArray) settings[i] = a[i];
                    else if (typeof settings[i] == 'object' && settings[i] !== null) {
                        var j = undefined;
                        for (j in settings[i]) {
                            if (typeof a[i][j] != 'undefined') settings[i][j] = a[i][j];
                        }
                        if (typeof j == 'undefined') settings[i] = a[i];
                    } else settings[i] = a[i];
                }
            }
        }
    }
    function loadUI() {
        $('head').append('<style type=text/css id=tastyplug-css>#tastyplug-ui{-moz-user-select:none;-webkit-user-select:none;position:absolute;width:150px;border-radius:10px;background-color:#1C1F25;background-image:-webkit-gradient(linear,left bottom,left top,color-stop(0,#1C1F25),color-stop(1,#282D33));background-image:-o-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-moz-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-webkit-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-ms-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:linear-gradient(to top,#1C1F25 0,#282D33 100%);z-index:9;padding-bottom:1.5px;color:#DDD}#tastyplug-ui a{color:inherit;text-decoration:none}.tastyplug-icon{position:relative;float:right}#tastyplug-ui .tp-toggle{color:#F04F30}#tastyplug-ui .tp-toggle.button-on{color:#1CC7ED}#tp-title{margin:0 15px;padding:3px 0;color:#A874FC;font-size:19px;cursor:move}.tp-mainbutton,.tp-secbutton{margin:0 15px;padding:2px 0 3px;font-size:15px;border-top:1px solid rgba(56,60,68,.85);cursor:pointer}.tp-highlight{background-color:rgba(168,116,252,.33)}.tp-secbutton{padding-left:8px}#tastyplug-ui .icon-drag-handle{position:relative;float:right;top:3px;height:14px;width:14px;background-position:-183px -113px}#waitlist-button .eta{left:45px;font-size:10px}#chat-messages .tastyplug-pm .icon{left:5.5px;top:6px}#chat-pm-button{left:-3px}#chat-messages div.tastyplug-pm.mention{background:linear-gradient(135deg,#FF00CB 0,#0a0a0a 13%,#0a0a0a 100%)}#chat-messages div.tastyplug-pm.mention:nth-child(2n+1){background:linear-gradient(135deg,#FF00CB 0,#111317 13%,#111317 100%)}#chat div[class*=" tp-"],#chat div[class^=tp-]{background-color:#0a0a0a}#chat div[class*=" tp-"]:nth-child(2n+1),#chat div[class^=tp-]:nth-child(2n+1){background-color:#111317}#chat-messages .tastyplug-pm .msg .from span.un{color:#FF00CB;font-weight:700}#user-lists .list.room .user .icon-meh{left:auto;right:8px;top:-1px}#chat-messages [data-cid|="3946454"]{background-color:#2D002D}#chat .mention:nth-child(2n+1)[data-cid|="3946454"],#chat .message:nth-child(2n+1)[data-cid|="3946454"],#chat-messages .emote:nth-child(2n+1)[data-cid|="3946454"]{background-color:#240024}#chat .emote[data-cid|="3946454"] .text,#chat .mention[data-cid|="3946454"] .text,#chat .message[data-cid|="3946454"] .text{font-weight:700;color:#CFCFCF}#chat .emote[data-cid|="3946454"] .text{font-style:normal}div.badge-box img.tastyplug-icon{padding:2px}#chat .cm.tp-info .text,#chat .cm.tp-info div.from.tastyplug span.un{color:#1CC7ED}#chat .cm.tp-info .text span{color:#EEE}#chat .cm.tp-error .text,#chat .cm.tp-error div.from.tastyplug span.un{color:#C42E3B}#chat .cm.tp-init .text,#chat .cm.tp-init div.from.tastyplug span.un{color:#D1D119}#chat .cm.tp-join-admin .text,#chat .cm.tp-join-admin div.from.tastyplug span.un{color:#1CC7ED}#chat .cm.tp-join-ba .text,#chat .cm.tp-join-ba div.from.tastyplug span.un{color:#088C30}#chat .cm.tp-join-host .text,#chat .cm.tp-join-host div.from.tastyplug span.un{color:#D1D119}#chat .cm.tp-join-cohost .text,#chat .cm.tp-join-cohost div.from.tastyplug span.un{color:#F59425}#chat .cm.tp-join-staff .text,#chat .cm.tp-join-staff div.from.tastyplug span.un{color:#C322E3}#chat .cm.tp-join-friend .text,#chat .cm.tp-join-friend div.from.tastyplug span.un{color:#009CDD}#chat .cm.tp-join-lvl1 .text,#chat .cm.tp-join-lvl1 div.from.tastyplug span.un{color:#FFDD6F}.tp-img{width:auto;height:auto;max-width:270px;max-height:250px}.legacy-chat .tastyplug-img-delete{top:26px}.tastyplug-img-delete{position:absolute;top:42px;right:4px;background-color:#F04F30;padding:0 3px;cursor:pointer;z-index:1}#playback .tp-video-hide,#playback.tp-video-hide{height:0!important}.custom-emote{display:inline-block;vertical-align:top}.custom-emote-mid{display:inline-block;vertical-align:middle}#chat-messages [data-cid|="3946454"] .bdg{background:url(https://tastyplug.tastycat.org/tastybot.png) no-repeat;left:2.5px;top:2.5px}.icon-tp-pm{background:url(https://tastyplug.tastycat.org/private-message.png) no-repeat}</style>');
        $('body').append('<div id=tp-room style=position:absolute;top:54px;left:0></div><div id=tastyplug-ui><div id=tp-title>TastyPlug <img class=tastyplug-icon src=https://tastyplug.tastycat.org/tastybot.png></div><div class="tp-mainbutton tp-toggle button-on" id=tp-autowoot><span>Autowoot</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-autojoin><span>Autojoin</span></div><div class="tp-mainbutton tp-toggle" id=tp-hidevideo><span>Hide Video</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-legacychat><span>Legacy Chat</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-boothalert><span>Booth Alert</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-histalert><span>History Alert</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-mehtrack><span>Meh Tracker</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-chatimgs><span>Chat Images</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-emotes><span>Cust. Emotes</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-emojis><div class="icon icon-drag-handle"></div><span>Tastymojis</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojiios><span>iOS</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojitwitter><span>Twitter</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojiandroid><span>Android</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-mentions><div class="icon icon-drag-handle"></div><span>Chat Mentions</span></div><div class="tp-secbutton tp-secmention" id=tp-addmention><span>Add</span></div><div class="tp-secbutton tp-secmention" id=tp-delmention><span>Delete</span></div><div class="tp-secbutton tp-secmention" id=tp-listmention><span>List</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-joinnotifs><div class="icon icon-drag-handle"></div><span>Join Notifs.</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinranks><span>Ranks</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinfriends><span>Friends</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinlvl1><span>Level 1s</span></div><a href=https://emotes.tastycat.org target=_blank><div class=tp-mainbutton id=tp-listemotes><span>Emotes List</span></div></a></div>');
        if (room == '/tastycat') $('#waitlist-button').append('<span class="eta"></span>');
        if (room == '/hummingbird-me') $('#tp-autojoin').remove();
        //$('#chat-header').append('<div id="chat-pm-button" class="chat-header-button"><i class="icon icon-ignore"></i></div>');
        if (!settings.autowoot) $('#tp-autowoot').removeClass('button-on');
        if (!settings.autojoin) $('#tp-autojoin').removeClass('button-on');
        if (!settings.boothalert) $('#tp-boothalert').removeClass('button-on');
        if (!settings.legacychat) $('#tp-legacychat').removeClass('button-on');
        /*        if (!settings.histalert) $('#tp-histalert').removeClass('button-on');
         if (!settings.mehtrack) $('#tp-mehtrack').removeClass('button-on');*/
        if (!settings.chatimgs) $('#tp-chatimgs').removeClass('button-on');
        if (!settings.emotes) $('#tp-emotes').removeClass('button-on');
        /*if (!settings.tastymojis) $('#tp-emojis').removeClass('button-on');*/
        if (!settings.chatmentions) $('#tp-mentions').removeClass('button-on');
        if (!settings.joinnotifs.toggle) $('#tp-joinnotifs').removeClass('button-on');
        if (!settings.joinnotifs.ranks) $('#tp-joinranks').removeClass('button-on');
        if (!settings.joinnotifs.friends) $('#tp-joinfriends').removeClass('button-on');
        /*        if (!settings.joinnotifs.lvl1) $('#tp-joinlvl1').removeClass('button-on');*/
        $('#tp-emoji' + settings.emojitype).addClass('button-on');
        if (!settings.show) {
            $('.tp-mainbutton').hide();
            $('#tastyplug-ui').css('padding-bottom','0');
        }
        if (getRank(API.getUser()) < 2) {
            $('#tp-histalert').remove();
            $('#tp-mehtrack').remove();
            $('#tp-joinlvl1').remove();
        }
        $('.tp-secbutton').hide();
        $('#tastyplug-ui').css(settings.uipos);
        var uicont = {
            width: $('.app-right').position().left,
            height: $('.app-right').height()
        };
        $('#tp-room').css(uicont);
        resize();
        /*for (var i = 1; i < sounds.length - 1; i++) {
         $('body').append('<audio id="' + sounds[i] + '-sound"><source src="https://fungustime.pw/tastyplug/sounds/' + sounds[i] + '.mp3"></audio>');
         }
         $('body').append('<audio id="default-sound"><source src="https://cdn.plug.dj/_/static/sfx/badoop.801a12ca13864e90203193b2c83c019c03a447d1.mp3"></audio>');
         if (settings.mention == sounds.indexOf('custom')) $('body').append('<audio id="custom-sound"><source src="' + settings.customsound + '"></audio>');*/
    }
    function loadEvents() {
        API.on({
            'chat':eventChat,
            'userJoin':eventJoin,
            'waitListUpdate':eventWLUpd,
            'advance':eventDjAdv,
            'chatCommand':eventCommand,
            'voteUpdate':refreshMehs,
            'grabUpdate':eventGrab
        });
        API.on('voteUpdate',eventVote);
        $(window).resize(resize);
        $('#users-button:not(.selected)').click(refreshMehs);
        //make it draggable
        var dragopts = {
            distance:20,
            handle:'#tp-title',
            containment:'#tp-room',
            scroll:false,
            start:function(){drag = true},
            stop:function(e,ui){
                drag = false;
                settings.uipos = ui.position;
                saveSettings();
            }
        };
        if ($.ui == undefined) {
            $.getScript('https://tastyplug.tastycat.org/jquery-ui.min.js',function(){
                $('#tastyplug-ui').draggable(dragopts);
            });
        } else $('#tastyplug-ui').draggable(dragopts);
        //hover over song title
        $('#now-playing-media').hover(
            function(){
                hover = true;
                if (API.getMedia()) {
                    var left = $('#now-playing-bar').position().left + 74;
                    $('body').append('<div id="tooltip" class="tp-songtitle" style="top:6px;left:' + left + 'px"><span>' +
                        API.getMedia().author + ' - ' + API.getMedia().title + '</span><div class="corner"></div></div>');
                }
            },
            function(){
                hover = false;
                $('#tooltip.tp-songtitle').remove();
            }
        );
        //quick reply to pm
        /*$('#chat-messages').on('click','.pm.from',function(){
         if ($('#chat-input-field').val()) return;
         var a = '/pm @' + $(this).children("span.un.clickable").text();
         $('#chat-input-field').val(a);
         $('#chat-input-field').focus();
         });*/
        //pm button
        /*$('#chat-pm-button i').click(function(){
         if (!$('.icon-mention-off').length) return Chat('error', 'Don\'t use this button while the mentions button is on! (Button to the left)');
         pms = !pms;
         $('#chat-pm-button i').attr('class',(pms ? 'icon icon-unignore' : 'icon icon-ignore'));
         $('#chat-messages').children().not('.tastyplug-pm').toggle();
         $('#chat-messages').scrollTop(20000);
         });*/
        //highlight ui buttons
        $('.tp-mainbutton,.tp-secbutton').hover(
            function(){$(this).addClass('tp-highlight')},
            function(){$(this).removeClass('tp-highlight')}
        );
        //tp title
        $('#tp-title').mouseup(function() {
            if (!drag) {
                settings.show = !settings.show;
                if (!settings.show) {
                    $('#tastyplug-ui').css('padding-bottom','0');
                    $('.tp-mainbutton').css('border-top','0');
                    $('.tp-secbutton').css('border-top','0');
                }
                $('#tastyplug-ui .tp-mainbutton').slideToggle(function(){
                    if (settings.show) {
                        $('#tastyplug-ui').css('padding-bottom','');
                        $('.tp-mainbutton').css('border-top','');
                        $('.tp-secbutton').css('border-top','');
                    }
                });
                $('.tp-secbutton,.tp-infobutt').slideUp();
                saveSettings();
            }
        });
        //tp autowoot
        $('#tp-autowoot').click(function() {
            settings.autowoot = !settings.autowoot;
            $(this).toggleClass('button-on');
            if (settings.autowoot) woot();
            saveSettings();
        });
        //autojoin
        $('#tp-autojoin').click(function() {
            settings.autojoin = !settings.autojoin;
            $(this).toggleClass('button-on');
            if (settings.autojoin && !getLocked() && API.getWaitListPosition() == -1) join();
            afkCheck();
            saveSettings();
        });
        //hide video
        $('#tp-hidevideo').click(function() {
            hidevideo = !hidevideo;
            $('#playback-container').toggleClass('tp-video-hide');
            $('#playback').toggleClass('tp-video-hide');
            hidevideo ? $('.background').hide() : $('.background').show();
            $(this).toggleClass('button-on');
        });
        //meh tracker
        /*$('#tp-mehtrack').click(function() {
         settings.mehtrack = !settings.mehtrack;
         $(this).toggleClass('button-on');
         saveSettings();
         });*/
        //booth alert
        $('#tp-boothalert').click(function() {
            settings.boothalert = !settings.boothalert;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        //legacy chat
        $('#tp-legacychat').click(function() {
            settings.legacychat = !settings.legacychat;
            $(this).toggleClass('button-on');
            legacyChat.toggle(settings.legacychat);
            saveSettings();
        });
        //history alert
        /* $('#tp-histalert').click(function() {
         settings.histalert = !settings.histalert;
         $(this).toggleClass('button-on');
         saveSettings();
         });*/
        //chat images
        $('#tp-chatimgs').click(function() {
            settings.chatimgs = !settings.chatimgs;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        //custom emotes
        $('#tp-emotes').click(function() {
            settings.emotes = !settings.emotes;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        // tastymojis
        /*$('#tp-emojis span').click(function() {
         settings.tastymojis = !settings.tastymojis;
         $(this).parent().toggleClass('button-on');
         if (tastyMojis) tastyMojis.toggle(settings.tastymojis);
         saveSettings();
         });
         $('#tp-emojiios').click(function() {
         if (settings.emojitype != 'ios') {
         $('#tp-emoji' + settings.emojitype).removeClass('button-on');
         settings.emojitype = 'ios';
         $(this).addClass('button-on');
         saveSettings();
         }
         });
         $('#tp-emojitwitter').click(function() {
         if (settings.emojitype != 'twitter') {
         $('#tp-emoji' + settings.emojitype).removeClass('button-on');
         settings.emojitype = 'twitter';
         $(this).addClass('button-on');
         saveSettings();
         }
         });
         $('#tp-emojiandroid').click(function() {
         if (settings.emojitype != 'android') {
         $('#tp-emoji' + settings.emojitype).removeClass('button-on');
         settings.emojitype = 'android';
         $(this).addClass('button-on');
         saveSettings();
         }
         });
         $('#tp-emojis .icon-drag-handle').click(function() {
         $('.tp-secmojis').slideToggle();
         });*/
        //chat mentions
        $('#tp-mentions span').click(function() {
            settings.chatmentions = !settings.chatmentions;
            $(this).parent().toggleClass('button-on');
            saveSettings();
        });
        $('#tp-addmention').click(function() {
            var len = settings.msgs.length;
            var a = prompt('Add words to the chat mentions list! Separate them with a comma.').trim().split(',');
            if (!a) return Chat('error', 'Please enter at least one word!');
            for (var i = 0; i < a.length; i++) {
                a[i] = a[i].trim().toLowerCase();
                if (a[i].length < 3) Chat('error', 'Did not add: ' + _.escape(a[i]) + ' (too short)');
                else if (settings.msgs.indexOf(a[i]) > -1) Chat('error', 'Did not add: ' + _.escape(a[i]) + ' (already on list)');
                else settings.msgs.push(a[i]);
            }
            if (settings.msgs.length > len) {
                Chat('info', 'Added word(s) to chat mentions list');
                saveSettings();
            }
        });
        $('#tp-delmention').click(function() {
            var a = prompt('Which word would you like to remove from the mentions list?');
            if (settings.msgs.indexOf(a) > -1) {
                settings.msgs.splice(settings.msgs.indexOf(a),1);
                Chat('info', 'Removed "' + _.escape(a) + '" from the chat mentions list');
                saveSettings();
            } else Chat('error', 'That word isn\'t in the mentions list!');
        });
        $('#tp-listmention').click(function() {
            var a = settings.msgs, b = [];
            for (var i = 0; i < a.length; i++) b.push(_.escape(a[i]));
            if (a.length) return Chat('info', 'Chat mentions list:<br>' + b.join('<br>'));
            return Chat('error', 'You don\'t have anything in your chat mentions list!');
        });
        $('#tp-mentions .icon-drag-handle').click(function() {
            $('.tp-secmention').slideToggle();
        });
        //join notifs
        $('#tp-joinnotifs span').click(function() {
            settings.joinnotifs.toggle = !settings.joinnotifs.toggle;
            $(this).parent().toggleClass('button-on');
            saveSettings();
        });
        $('#tp-joinranks').click(function() {
            settings.joinnotifs.ranks = !settings.joinnotifs.ranks;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        $('#tp-joinfriends').click(function() {
            settings.joinnotifs.friends = !settings.joinnotifs.friends;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        /*        $('#tp-joinlvl1').click(function() {
         settings.joinnotifs.lvl1 = !settings.joinnotifs.lvl1;
         $(this).toggleClass('button-on');
         saveSettings();
         });*/
        $('#tp-joinnotifs .icon-drag-handle').click(function() {
            $('.tp-secjoin').slideToggle();
        });
    }
    function loadEmotes() {
        $.ajax({
            cache: false,
            url: "https://emotes.tastycat.org/emotes-full.json",
            dataType: "json",
            success: function(a) {
                for(var key in a.emotes) {
                    if(a.emotes.hasOwnProperty(key)) {
                        emotes[key.toLowerCase()] = a.emotes[key];
                    }
                }
                /*                for (var i in a) {
                 for (var j in a[i]) {
                 emotes[j.toLowerCase()] = a[i][j];
                 }
                 }*/
            },
            error: function() {
                Chat('error', 'Could not load the TastyPlug custom emotes. Refresh and/or try again later.');
            }
        });
        /*$.ajax({
         cache: false,
         url: "https://fungustime.pw/tastyplug/emotes/json/subs.json",
         dataType: "json",
         success: function(a) {
         var tmpl = 'https:' + a.template.small, chan = a.channels;
         for (var i in chan) {
         var em = chan[i].emotes;
         for (var j = 0; j < em.length; j++) {
         if (!(chan[i].emotes[j].code.toLowerCase() in emotes)) {
         emotes[chan[i].emotes[j].code.toLowerCase()] = {
         url: tmpl.replace('{image_id}', chan[i].emotes[j].image_id),
         width: '28px',
         height: '28px'
         };
         }
         }
         }
         },
         error: function() {
         Chat('error', 'Could not load the Twitch.tv sub emotes. Refresh and/or try again later.');
         }
         });*/
        /*$.ajax({
         cache: false,
         url: "https://fungustime.pw/tastyplug/emotes/json/rcs.json",
         dataType: "json",
         success: function(a) {
         for (var i in a) {
         if (!(i in emotes)) {
         emotes[i] = a[i];
         }
         }
         },
         error: function() {
         Chat('error', 'Could not load the RCS emotes. Refresh and/or try again later.');
         }
         });*/
        }
        tastyPlugShutDown = function() {
            API.off({
                'chat':eventChat,
                'userJoin':eventJoin,
                'waitListUpdate':eventWLUpd,
                'advance':eventDjAdv,
                'chatCommand':eventCommand,
                'voteUpdate':refreshMehs
            });
            API.off('voteUpdate',eventVote);
            $(window).off('resize',resize);
            $('#users-button').off('click',refreshMehs);
            $('#chat-messages .pm-from').off('click');
            $('.tp-img-delete').off('click');
            $('#chat-messages .message,#chat-messages .mention,#chat-messages .emote').has('img').off('mouseenter mouseleave');
            $('#now-playing-media').off('mouseenter mouseleave');
            $('#chat-pm-button').remove();
            $('#waitlist-button').find('.eta').remove();
            $('#playback-container').removeClass('tp-video-hide');
            $('.background').show();
            $('#playback').removeClass('tp-video-hide');
            $('#tastyplug-ui').remove();
            $('#tastyplug-css').remove();
            $('#legacy-chat-stylesheet').remove();
            $('#tp-room').remove();
            $('#tooltip.tp-songtitle').remove();
            for (var i = 0; i < sounds.length; i++) {
                $('#' + sounds[i] + '-sound').remove();
            }
            legacyChat.toggle(false);
/*
            if (tastyMojis) tastyMojis.toggle(false);
*/
            $('#tastymoji-css').remove();
            reconnect = false;
            for (var i in tos) clearInterval(tos[i]);
            saveSettings();
            if (sock) sock.close();
            console.log('[TastyPlug v' + version + '] shut down.');
        };
        function eventChat(a) {
            if (!a.cid || a.cid == lastchat) return;
            lastchat = a.cid;
            var msg = $('.cid-'+a.cid).parent();
            //if (pms && !msg.hasClass('.tastyplug-pm')) msg.hide();
            if (settings.emotes) {
                var txt = msg.find('.text'), html = txt.html();
                var chat = $('#chat-messages'), d = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
                html = custEmotes(html);
                txt.html(html);
                if (d) chat.scrollTop(chat[0].scrollHeight);
            }
            if (settings.chatimgs && a.message.toLowerCase().indexOf('nsfw') == -1) {
                var txt = msg.find('.text'), txts = txt.text().trim().split(' ');
                for (var i = 0; i < txts.length; i++) {
                    if (/^https?:\/\//i.test(txts[i])) {
                        if (/.(gif|png|jpe?g)/i.test(txts[i])) return checkImg(txts[i],txt);
                        else if (/.(webm|gifv)$/i.test(txts[i])) return checkVid(txts[i],txt);
                    }
                }
            }
            var b = document.createElement('div');
            b.innerHTML = a.message;
            var message = b.textContent.replace(/  +/g, ' ').trim();
            if (a.uid == API.getUser().id) {
                afktime = Date.now();
            }
            if (!settings.chatmentions || a.uid == API.getUser().id || a.type == 'mention') return;
            b = message.toLowerCase().split(' ');
            for (var i = 0; i < settings.msgs.length; i++) {
                if (b.indexOf(settings.msgs[i]) > -1) return chatSound();
            }
        }
        function eventJoin(a) {
            if (!settings.joinnotifs.toggle) return;
            if (!a.username) return;
            if (!settings.joinnotifs.ranks && !settings.joinnotifs.friends/* && !settings.joinnotifs.lvl1*/) return;
            var b, rank = getRank(a), str = '';
            if (rank) switch (rank) {
                case 10: b = 'admin'; break;
                case 8: b = 'ba'; break;
                case 5: b = 'host'; break;
                case 4: b = 'cohost'; break;
                case 3:case 2:case 1: b = 'staff'; break;
                default: b = 'undef'; break;
            }
            else if (settings.joinnotifs.friends && a.friend) b = 'friend';
            /*else if (settings.joinnotifs.lvl1 && getRank(API.getUser()) >= 2 && a.level == 1) b = 'lvl1';*/
            if (b) {
                /*if (b == 'lvl1') str += '[Lvl 1 - ID: ' + a.id + '] ';*/
                str += _.escape(a.username) + ' joined the room';
                Chat('join-' + b, str);
            }
        }
        function eventWLUpd() {
            if (settings.autojoin && !getLocked() && API.getWaitListPosition() == -1) join();
            if (settings.boothalert && API.getWaitListPosition() < settings.boothnotify && API.getWaitListPosition() != -1 && !boothcd) {
                chatSound();
                Chat('info','[Booth Alert] It\'s almost your turn to DJ! Make sure to pick a song!');
                boothcd = true;
                /*if (room == '/tastycat' && sock.readyState == 1) API.sendChat('/cs n');*/
            }
        }
        function eventDjAdv(a) {
            if (settings.autojoin && !getLocked() && API.getWaitListPosition() == -1) join();
            if (settings.autowoot) setTimeout(woot,(Math.floor(Math.random()*10)+1)*1000);
            if (!a.dj) return;
            if (a.dj.id == API.getUser().id) boothcd = false;
            /*if (settings.histalert && getRank(API.getUser()) >= 2 && a.media) {
             var hist = API.getHistory();
             for (var i = 0; i < hist.length; i++) {
             if (hist[i].media.cid == a.media.cid) {
             Chat('error','This song is on the history! (played ' + (i + 1) + ' song' + (i == 0 ? '' : 's') + ' ago)');
             chatSound();
             break;
             }
             }
             }*/
            curvotes = {};
            if (hover) {
                $('#tooltip.tp-songtitle').remove();
                if (API.getMedia()) {
                    var left = $('#now-playing-bar').position().left + 74;
                    $('body').append('<div id="tooltip" class="tp-songtitle" style="top:6px;left:' + left + 'px"><span>' +
                        API.getMedia().author + ' - ' + API.getMedia().title + '</span><div class="corner"></div></div>');
                }
            }
            /*if (settings.autocheck) API.sendChat('/cs');
             if (settings.autolabel) API.sendChat('/labelcheck');*/
        }
        function eventCommand(a) {
            var cmd = a.trim().substr(1).split(' ')[0].toLowerCase();
            var data = {
                uid: API.getUser().id,
                un: API.getUser().username,
                message: a.trim(),
                room: room,
                'censored': true
            };
            /*if (cmd == 'opcheck' || cmd == 'check') commands.cs(data);
             else if (commands[cmd]) commands[cmd](data);
             else if (room == '/tastycat' && sock.readyState == 1) sock.msg({z:'command',a:data});*/
        }
        function eventGrab(a) {
            /*if (!settings.grabnotifs.toggle |) {
             Chat('grab', a.user.username + ' grabbed this song!');
             }*/
        }
        function eventVote(a) {
            /*if (settings.mehtrack && getRank(API.getUser()) >= 2 && a.vote == -1 && !curvotes[a.user.id]) {
             curvotes[a.user.id] = true;
             Chat('error', _.escape(a.user.username) + ' meh\'d the song!');
             }*/
        }
        function refreshMehs() {
            /*if ($('#users-button').hasClass('selected') && $('.button.room').hasClass('selected')) {
             $('#user-lists .list.room i.icon.icon-meh').remove();
             var users = $(API.getUsers()).filter(function(){return this.vote == -1 && !this.curated;});
             users.each(function(i){
             $('#user-lists .list.room .user span').filter(function(){return $(this).text()==users[i].username;}).parent().append('<i class="icon icon-meh"></i>');
             });
             }*/
        }
        commands.lock = function(a) {
            /*if (getRank(API.getUser()) >= 3) API.moderateLockWaitList(true);
             else if (room == '/tastycat' && sock.readyState == 1) sock.msg({z:'command',a:a});*/
        };
        commands.unlock = function(a) {
            /*if (getRank(API.getUser()) >= 3) API.moderateLockWaitList(false);
             else if (room == '/tastycat' && sock.readyState == 1) sock.msg({z:'command',a:a});*/
        };
        commands.cycle = function(a) {
            /*if (getRank(API.getUser()) >= 3) $('.cycle-toggle').click();
             else if (room == '/tastycat' && sock.readyState == 1) sock.msg({z:'command',a:a});*/
        };
        commands.ban = function(a) {
            if (getRank(API.getUser()) < 3) return;
            var user = getUser(a.message.substr(a.message.indexOf('@')+1));
            if (!user) return Chat('error', 'User not found.');
            if (getRank(user)) return Chat('error', 'You shouldn\'t ban those with ranks!');
            API.moderateBanUser(user.id,0,API.BAN.PERMA);
        };
        commands.kick = function(a) {
            if (getRank(API.getUser()) < 2) return;
            var msg = a.message.split(' '), user, dur;
            if (msg[msg.length-1] != 'day' && msg[msg.length-1] != 'hour') {
                /*if (sock.readyState == 1) sock.msg({z:'command',a:a});*/
            } else {
                user = getUser(msg.slice(1,msg.length-1).join(' ').substr(1));
                if (!user) return Chat('error', 'User not found.');
                if (user.role || user.gRole) return Chat('error', 'You shouldn\'t kick those with ranks!');
                dur = msg[msg.length-1] == 'day' ? API.BAN.DAY : API.BAN.HOUR;
                API.moderateBanUser(user.id,0,dur);
            }
        };
        commands.skip = function(a) {
            if (room == '/tastycat' && sock.readyState == 1) sock.msg({z:'command',a:a});
            else if (getRank(API.getUser()) >= 2) API.moderateForceSkip();
        };
        commands.mute = function(a) {
            var b = a.message.split(' ');
            if (b.length == 1) return false;
            var c, user;
            switch(b[b.length-1].toLowerCase()) {
                case 's':
                case 'short':
                case '15':
                    c = API.MUTE.SHORT;
                    user = getUser(b.slice(1,b.length-1).join(' ').substr(1));
                    break;
                case 'm':
                case 'medium':
                case '30':
                    c = API.MUTE.MEDIUM;
                    user = getUser(b.slice(1,b.length-1).join(' ').substr(1));
                    break;
                case 'l':
                case 'long':
                case '45':
                    c = API.MUTE.LONG;
                    user = getUser(b.slice(1,b.length-1).join(' ').substr(1));
                    break;
                default:
                    c = API.MUTE.SHORT;
                    user = getUser(b.slice(1).join(' ').substr(1));
            }
            if (!user) return Chat('error', 'User not found.');
            if (getRank(user)) return Chat('error', 'You can\'t mute those with ranks!');
            API.moderateMuteUser(user.id, 1, c);
        };
        commands.pm = function(a) {
            /*if (!togglepm) return Chat('error', 'You toggled PMs off! To turn them back on, type /pmtoggle.');
             if (sock.readyState != 1) return Chat('error', 'Not connected to TastyPlug\'s server!');
             if (a.message == '/pm') return Chat('info', 'Usage: <span>/pm @user message</span><br>Sends a private message to the user if they are using Tastyplug');
             var str = a.message.substr(5).split(' '), user;
             for (var i = 1; i <= str.length; i++) {
             user = getUser(str.slice(0,i).join(' '));
             if (user) break;
             }
             if (!user) return Chat('error', 'User not found.');
             if (user.id == API.getUser().id) return Chat('error', 'You can\'t PM yourself!');
             var msg = str.slice(i).join(' ');
             if (!msg) return Chat('error', 'Please input a message to send!');
             sock.msg({z:'pm',m:msg,f:API.getUser(),t:user})
             ChatPM('To: ' + user.username,msg);
             return true;*/
        };
        commands.r = function(a) {
            /*if (settings.lastPM) eventCommand('/pm @' + settings.lastPM + ' ' + a.message.split(' ').slice(1).join(' '));
             else Chat('error', 'Nobody has PMed you yet!');*/
        };
        commands.reset = function(a) {
            /* if (a && a.message.indexOf('all') > -1 && API.getUser().id == 4684278) {
             if (sock.readyState == 1) sock.msg({z:'censored'});
             else Chat('error', 'Error: Not connected to socket');
             } else {
             Chat('init', 'Reloading...');*/
            setTimeout(function(){$.getScript('https://tastyplug.tastycat.org/tastyplug.js')},1000);
            /*}*/
        };
        commands.commands = function() {
            if (room == '/tastycat') Chat('info', 'Tastybot commands: <a href="http://tastycat.net/tastybot/" target="_blank">Click Here</a>');
            /*Chat('info', 'TastyPlug commands: <span>' + Object.keys(commands).join(', ') + '</span>');*/
        };
        commands.whois = function(a) {
            var user = getUser(a.message.split(' ').slice(1).join(' ').substr(1)), rank;
            if (!user) return Chat('error','User not found.');
            var pos = API.getWaitListPosition(user.id);
            switch (getRank(user)) {
                case 10: rank = 'plug.dj Admin'; break;
                case 8: rank = 'Brand Ambassador'; break;
                case 5: rank = 'Host'; break;
                case 4: rank = 'Co-Host'; break;
                case 3: rank = 'Manager'; break;
                case 2: rank = 'Bouncer'; break;
                case 1: rank = 'Resident DJ'; break;
                case 0: rank = 'User'; break;
                default: rank = 'Unknown';
            }
            if (API.getDJ().id == user.id) pos = 'Currently DJing';
            else if (pos == -1) pos = 'Not on list';
            else pos++;
            Chat('info','Username: <span>' + user.username + '</span><br>ID: <span>' + user.id +
                '</span><br>Rank: <span>' + rank + '</span><br>Level: <span>' + user.level + '</span><br>Wait List: <span>' + pos + '</span>');
        };
        commands.users = function() {
            /*if (sock.readyState == 1) sock.msg({z:'censored'});
             else Chat('error', 'Error: Not connected to TastyPlug\'s server!');*/
        };
        commands.say = function(a) {
            /*var b = [4684278,3420424,3767269];
             if (b.indexOf(API.getUser().id) > -1 && sock.readyState == 1) {
             var msg = a.message.split(' ').slice(1).join(' ');
             if (!msg) return;
             sock.msg({z:'censored',a:msg});
             }*/
        };
        commands.cs = function(a) {
            /*if (room != '/tastycat') return;
             if (sock.readyState != 1) return Chat('error', 'Not connected to TastyPlug\'s server!');
             var b = a.message.split(' '), song, c;
             if (b[1] == 'next' || b[1] == 'n') {
             c = API.getNextMedia().media;
             song = 'Next on your playlist';
             } else {
             c = API.getMedia();
             song = 'Currently Playing';
             }
             sock.msg({z:'songcheck',id:c.format+':'+c.cid,song:song,author:c.author,title:c.title});
             return true;*/
        };
        commands.link = function() {
            var b = API.getMedia();
            if (b.format == '1') Chat('info', 'Current song: <a href="http://youtu.be/' + b.cid + '" target="_blank">Click Here</a>');
            else SC.get('/tracks/' + b.cid, function(c) {
                Chat('info', 'Current song: ' + (c.permalink_url ? ('<a href="' + c.permalink_url + '" target="_blank">Click Here</a>') : 'Link not found'));
            });
        };
        commands.pic = function() {
            var b = API.getMedia();
            if (b.format == 1) Chat('info', 'Video image: <a href="http://i1.ytimg.com/vi/' + b.cid + '/maxresdefault.jpg" target="_blank">Click Here</a>');
            else SC.get('/tracks/' + b.cid, function(c) {
                Chat('info', 'Song art: ' + (c.artwork_url ? ('<a href="' + c.artwork_url + '" target="_blank">Click Here</a>') : 'Artwork unavailable'));
            });
        };
        commands.uireset = function() {
            settings.uipos = {'top':'54px','left':'0'};
            $('#tastyplug-ui').css(settings.uipos);
            saveSettings();
            Chat('info', 'UI position reset');
        };
        commands.hidden = function() {
            settings.hidden = !settings.hidden;
            saveSettings();
            Chat('info', 'Hidden emotes ' + (settings.hidden ? 'enabled!' : 'disabled!'));
        };
        commands.bgurl = function(a) {
            /*var b = a.message.substr(7);
             if (b == 'default') b = 'https://cdn.plug.dj/_/static/images/community/custom/tastycat/background.3eea43d47180b19e8ab774aa1afc8272c424bfd4.jpg';
             $('body').css('background-image','url(' + b + ')');
             Chat('info', 'Changed background image!');*/
        };
        commands.autocheck = function() {
            /* settings.autocheck = !settings.autocheck;
             Chat('info', 'Autocheck ' + (settings.autocheck ? 'enabled!' : 'disabled!'));
             saveSettings();*/
        };
        commands.autolabel = function() {
            /*settings.autolabel = !settings.autolabel;
             Chat('info', 'Autolabel ' + (settings.autolabel ? 'enabled!' : 'disabled!'));
             saveSettings();*/
        };
        commands.mentionsound = function(a) {
            /*var b = a.message.split(' ').slice(1);
             if (!b.length) return Chat('info', 'Usage: <span>/mentionsound [sound]</span><br>Available sounds: ' + sounds.join(', '));
             if (sounds.indexOf(b[0]) == -1) return Chat('error', 'Invalid sound. Available sounds: ' + sounds.join(', '));
             if (b[0] == 'custom') {
             if (!b[1] || !(/.(mp3|wav|ogg)/i.test(b[1])) || !(/^https?:\/\//i.test(b[1]))) return Chat('error', 'Please supply a direct link to a valid mp3, wav, or ogg file!<br>Usage: /mentionsound custom [link]');
             $('#custom-sound').remove();
             $('body').append('<audio id="custom-sound"><source src="' + b[1] + '"></audio>');
             settings.customsound = b[1];
             }
             settings.mention = sounds.indexOf(b[0]);
             saveSettings();
             chatSound();
             Chat('info', 'Mention sound set to <span>' + b[0] + '</span>.<br>Turn off mention sounds by changing to <span>default</span> or clicking the mention toggle at the top of the chat.');*/
        };
        commands.profile = function(a) {
            var b = a.message.substr(10), link = '@/', name, link, slug;
            name = b || API.getUser().username;
            slug = name.replace(/(_|\[|\]|\(|\)|\.)/g, ' ').replace(/'/g, '').trim();
            link += encodeURI(slug.replace(/( )/ig, '-')).toLowerCase();
            Chat('info', 'Profile link for <span>' + name + ':</span> <a href="' + link + '" target="_blank">Click here</a>');
        };
        commands.boothnotify = function(a) {
            var b = a.message.substr(13);
            settings.boothnotify = ~~b || 3;
            Chat('info', 'Booth Alert notification spot changed to spot <span>' + settings.boothnotify + '</span>.');
            saveSettings();
        };
        commands.pmtoggle = function() {
            /*if (!sock || sock.readyState != 1) return Chat('error', 'Not connected to TastyPlug\'s server!');
             togglepm = !togglepm;
             Chat('info', 'Receiving TastyPlug PMs ' + (togglepm ? 'enabled!' : 'disabled!'));*/
        };
        function Chat(type, m) {
            if ($('#chat-button').css('display') == 'block') {
                var chat = $('#chat-messages'), a = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28,
                    d = $('#chat-timestamp-button .icon').attr('class').substr(21),
                    user = "TastyPlug",
                    f = new Date().toTimeString().substr(0,5);
                if (d == '12') {
                    var g = parseInt(f),
                        h = g >= 12 ? 'pm' : 'am',
                        i = g%12 == 0 ? '12' : g%12;
                    f = i + f.substr(2) + h;
                }
                if (f.charAt(0) == '0') f = f.substr(1);
                chat.append('<div class="cm message tastyplug-message tp-' + type + '"><div class="badge-box"><img class="tastyplug-icon" src="https://tastyplug.tastycat.org/tastybot.png"/></div><div class="msg"><div class="from tastyplug"><span class="un">' + user + '</span><span class="timestamp" style="display: inline;">' + f + '</span></div><div class="text">' + m + '</div></div></div>');
                if (a) chat.scrollTop(chat[0].scrollHeight);
                if (chat.children().length >= 512) chat.children().first().remove();
            } else API.chatLog(m.replace(/<br>/g,', ').replace(/<\/?span>/g,''),true);
        }
        function ChatPM(user, msg) {
            /*if ($('#chat-button').css('display') == 'block') {
             var chat = $('#chat-messages'), a = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28,
             c = !user.indexOf('To: ') ? '-to' : '-from clickable',
             d = $('#chat-timestamp-button .icon').attr('class').substr(21),
             e = d == 'off' ? 'none' : 'block',
             f = new Date().toTimeString().substr(0,5), j = false,
             k = !user.indexOf('To: ') ? ' message' : ' mention is-pm';
             header = !user.indexOf('To: ') ? '<span class="pm-header">To: </span>' : '';
             if (d == '12') {
             var g = parseInt(f),
             h = g >= 12 ? 'pm' : 'am',
             i = g%12 == 0 ? '12' : g%12;
             f = i + f.substr(2) + h;
             }
             if (f.charAt(0) == '0') f = f.substr(1);
             msg = urlFix(_.escape(msg));
             if (tastyMojis) msg = tastyMojis.emojify()(msg);
             if (settings.emotes) msg = custEmotes(msg);
             if (!msg.indexOf('/me')) { msg = msg.replace('/me','<em>'); j = true; }
             else if (!msg.indexOf('/em')) { msg = msg.replace('/em','<em>'); j = true; }
             j = j ? '' : '&nbsp;';
             user = !user.indexOf('To: ') ? user.substring(4) : user;
             chat.append('<div class="cm tastyplug-pm' + k + '"><div class="badge-box"><i class="icon icon-tp-pm"></i></div><div class="msg"><div class="from pm">'+ header+'<span class="un clickable">' + _.escape(user) + ' </span><span class="timestamp" style="display: inline;">' + f + '</span></div><div class="text">' + msg + '</div></div></div>');
             if (a) chat.scrollTop(chat[0].scrollHeight);
             if (chat.children().length >= 512) chat.children().first().remove();
             } else API.chatLog('[PM] ' + user + ': ' + msg);*/
        }
        function eta() {
            tos.eta = setInterval(function(){
                var pos = API.getWaitListPosition();
                var str = pos == -1 ? '' : ('ETA: ' + getTime(pos*1000*60*4 + API.getTimeRemaining()*1000));
                $('#waitlist-button').find('.eta').text(str);
            },10000);
        }
        function resize() {
            var room = $('#tp-room'), rpos = room.position(), rwidth = room.width(), rheight = room.height(),
                ui = $('#tastyplug-ui'), uipos = ui.position(), uiwidth = ui.width(), uiheight = ui.height(),
                a = Object.keys(rpos),
                uicont = {
                    width: $('.app-right').position().left,
                    height: $('.app-right').height()
                };
            $('#tp-room').css(uicont);
            for (var i = 0; i < a.length; i++) if (uipos[a[i]] < rpos[a[i]]) ui.css(a[i], rpos[a[i]]);
            uipos = $('#tastyplug-ui').position();
            if (uiwidth + uipos.left > rwidth) ui.css('left', rwidth-uiwidth);
            if (uiheight + uipos.top > rheight) ui.css('top', rheight-uiheight);
            settings.uipos = ui.position();
            if (settings.fullscreen) fullScreen();
            saveSettings();
        }
        function getUser(a) {
            a = a.trim().toLowerCase();
            var b = API.getUsers();
            for (var i = 0; i < b.length; i++) if (b[i].username.toLowerCase() == a) return b[i];
            return null;
        }
        function getTime(a) {
            a = Math.floor(a/60000);
            var minutes = (a-Math.floor(a/60)*60);
            var hours = (a-minutes)/60;
            var str = '';
            str += hours + 'h';
            str += minutes<10?'0':'';
            str += minutes;
            return str;
        }
        function getRank(a) {
            if (a.gRole) switch (a.gRole) {
                case 5: return 10;
                case 4:case 3:case 2: return 8;
                default:return 6;
            }
            return a.role;
        }
        function urlFix(a) {
            if (a.indexOf('http') == -1) return a;
            a = a.split(' ');
            for (var i = 0; i < a.length; i++) if (!a[i].indexOf('http')) a[i] = '<a href="' + a[i] + '" target="_blank">' + a[i] + '</a>';
            return a.join(' ');
        }
        function afkCheck() {
            if (settings.autojoin) tos.afkInt = setInterval(function(){
                if (Date.now() - afktime >= 12E5) {
                    settings.autojoin = false;
                    $('#tp-autojoin').removeClass('button-on');
                    clearInterval(tos.afkInt);
                }
            },6E4);
            else clearInterval(tos.afkInt);
        }
        function checkImg(a, b) {
            var img = new Image();
            img.onload =  function() {
                img.className += 'tp-img';
                var c = b.html().replace('<a href="' + a + '" target="_blank">' + a + '</a>', '<br><a href="' + a + '" target="_blank">' + img.outerHTML + '</div></a>');
                if (c.indexOf('<br>') == 0) c = c.substr(4);
                b.parent().append('<div class="tastyplug-img-delete" style="display:none">X</div>');
                b.parent().parent().hover(
                    function(){$(this).find('.tastyplug-img-delete').css('display','block')},
                    function(){$(this).find('.tastyplug-img-delete').css('display','none')}
                );
                b.parent().find('.tastyplug-img-delete').click(function(){
                    var a = $(this).parent().find('img')[0].src;
                    $(this).parent().find('br').remove();
                    $(this).parent().find('img').parent().append(a).find('img').remove();
                    $(this).remove();
                });
                var chat = $('#chat-messages'), d = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
                b.html(c);
                if (d) chat.scrollTop(chat[0].scrollHeight);
            };
            img.src = a;
        }
        function checkVid(a, b) {
            var c = a.replace(/.gifv$/i, '.webm');
            var d = b.html().replace('<a href="' + a + '" target="_blank">' + a + '</a>', '<br><a href="' + a + '" target="_blank"><video autoplay muted loop class="tp-img"><source src="' + c + '"></video></a>');
            if (d.indexOf('<br>') == 0) d = d.substr(4);
            b.parent().append('<div class="tastyplug-img-delete" style="display:none">X</div>');
            b.parent().parent().hover(
                function(){$(this).find('.tastyplug-img-delete').css('display','block')},
                function(){$(this).find('.tastyplug-img-delete').css('display','block')}
            );
            b.parent().find('.tastyplug-img-delete').click(function(){
                var a = $(this).parent().find('video a').first().text();
                $(this).parent().find('br').remove();
                $(this).parent().find('video').parent().append('<a href="' + a + '" target="_blank">' + a + '</a>').find('video').remove();
                $(this).remove();
            });
            var chat = $('#chat-messages'), e = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
            b.html(d);
            if (e) chat.scrollTop(chat[0].scrollHeight);
        }
        function custEmotes(txt) {
            if (!Object.keys(emotes).length || typeof txt != 'string') return;
            var em = txt.match(/:[^:\s]+:/g);
            if (!em) return txt;
            for (var i = 0; i < em.length; i++) {
                var emlow = em[i].substring(1, em[i].length-1).toLowerCase();
                for (var j in emotes) {
                    if (emlow == j.toLowerCase()) {
                        if (!settings.hidden && emotes[j].hidden) break;
                        var msg = txt.split(em[i]), res = msg[0];
                        for (var k = 1; k < msg.length; k++) {
                            var align = parseInt(emotes[j].height) < 20 ? '-mid' : '';
                            res += '<div class="custom-emote' + align + '" title="' + (emotes[j].hidden ? 'Hidden Emote!' : j) + '" style="background-image:url(' + emotes[j].url + ');width:' + emotes[j].width + 'px;height:' + emotes[j].height + 'px;"></div>';
                            res += msg[k];
                        }
                        txt = res;
                        break;
                    }
                }
            }
            return txt;
        }
        function join() {
            if (!joincd && room != '/hummingbird-me') {
                API.djJoin();
                joincd = true;
                setTimeout(function(){joincd = false},5000);
            }
        }
        function chatSound() {
            if ($('.icon-chat-sound-on').length) {
                document.getElementById(sounds[settings.mention] + '-sound').play();
            }
        }
        function saveSettings(){localStorage.setItem('tastyPlugSettings',JSON.stringify(settings))}
        function getLocked(){return $('.lock-toggle .icon').hasClass('icon-locked')}
        function woot(){$('#woot').click()}

        // Original legacy chat author: @git
        var legacyChat = (function() {
            "use strict";
            var legacyChatStylesheet = "div#chat-messages div.cm.legacy-chat{min-height:0;width:auto}div#chat div.cm.legacy-chat.mention{background:#0a0a0a}div#chat div.cm.legacy-chat.mention:nth-child(2n+1){background:#111317}div#chat-messages div.legacy-chat div.badge-box{height:0;overflow:hidden;position:absolute}#chat-messages div.from.pm span.pm-header{padding:0;color:#FF00CB}#chat-messages div.legacy-chat i.icon{margin:6px}#chat-messages div.legacy-chat i.icon.icon-tp-pm{margin:0}#chat-messages div.legacy-chat.is-admin{border-left:3px solid #42a5dc}#chat-messages div.legacy-chat.is-ambassador{border-left:3px solid #89be6c}#chat-messages div.legacy-chat.is-staff,#chat-messages div.legacy-chat.is-dj{border-left:3px solid #ac76ff}#chat-messages div.legacy-chat.is-you{border-left:3px solid #ffdd6f}#chat-messages div.legacy-chat.is-pm{border-left:3px solid #FF00CB}#chat-messages div.legacy-chat div.msg{padding:4px 5px 5px 27px}div.legacy-chat div.msg div.from span.un{padding-right:3px}#chat-messages div.text{display:inline}#chat-messages div.text:before{content:' '}div.legacy-chat.mention div.msg div.from div.text,div.legacy-chat.message div.msg div.from div.text{color:#eee}div.legacy-chat div.msg div.from:before{content:'';float:right;width:50px;height:1px}#chat-messages div.legacy-chat div.msg div.from span.timestamp{position:absolute;right:0;top:1px;float:right}.tastyplug-message.legacy-chat span.un{display:none}#chat-messages div.mention.legacy-chat i.icon,#chat-messages div.mention.legacy-chat i.icon.icon-tp-pm{left:-2px}#chat-messages div.mention div.msg{padding-left:24px}#chat-messages .legacy-chat .delete-button{padding:1px 7px}#chat-messages .tastyplug-pm.mention i.icon.icon-tp-pm.legacy-fake-icon{left:1px}#chat-messages i.icon.icon-tp-pm.legacy-fake-icon{left:4px}",
                legacyChatFile = '<style id="legacy-chat-stylesheet" type="text/css">' + legacyChatStylesheet + '</style>',
                toHideBadges = false;
            $('head').append(legacyChatFile);
            var convertToLegacy = function(node) {
                node.addClass("legacy-chat");
                var badge = node.find("div.badge-box"),
                    message = node.find("div.msg"),
                    messageData = message.find("div.from"),
                    icon = messageData.children("i.icon"),
                    messageText = message.find("div.text"),
                    messageTime = messageData.find("span.timestamp"),
                    messageUser = messageData.find("span.un");

                icon.hide();
                if(message.children("div.subscriber")[0]) {
                    icon = $('<i class="icon icon-chat-subscriber legacy-fake-icon"></i>');

                    icon.insertAfter(badge);
                } else if(message.children("div.staff, div.dj")[0]) {
                    var staffIcon = icon.last().clone();
                    staffIcon.addClass("legacy-fake-icon");
                    staffIcon.insertAfter(badge);
                    staffIcon.show();
                } else if(message.children("div.you")[0]){
                    var baIcon = icon.filter(".icon-chat-ambassador");
                    var legacyIcon = baIcon.length ? baIcon : icon.last();
                    icon.not(legacyIcon).hide();
                    legacyIcon.insertAfter(badge);
                    legacyIcon.show();
                } else if(message.children("div.ambassador")[0]) {
                    icon = $('<i class="icon icon-chat-ambassador legacy-fake-icon"></i>');
                    icon.insertAfter(badge);
                } else if(message.children("div.from.pm")[0]) {
                    icon = $('<i class="icon icon-tp-pm legacy-fake-icon"></i>');
                    icon.insertAfter(badge);
                } else if(message.children("div.admin")[0]) {
                    icon = $('<i class="icon icon-chat-admin legacy-fake-icon"></i>')
                    icon.insertAfter(badge);
                }
                messageText.insertAfter(messageUser);
            };

            var convertFromLegacy = function(node) {
                var message = node.find("div.msg"),
                    messageData = message.find("div.from"),
                    messageUser = messageData.find("span.un"),
                    messageText = message.find("div.text"),
                    messageTime = message.find("span.timestamp"),
                    icon = node.children("i.icon:not(.legacy-fake-icon)");
                if(icon.length) {
                    messageData.prepend(icon);
                }
                messageData.children().show();
                messageText.insertAfter(messageData);
                node.removeClass("legacy-chat");
            };

            var legacyChatObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if(toHideBadges){
                        var nodes = mutation.addedNodes,
                            i = 0;
                        for (i = 0; i < nodes.length; ++i) {
                            if (nodes[i].nodeType === Node.ELEMENT_NODE) {
                                convertToLegacy($(nodes[i]).find('*').andSelf().filter("div.cm:not(.legacy-chat,.welcome,.update)"));
                            }
                        }
                    }
                });
            });
            // Calling it with bool parameter also sets legacy mode bool
            var toggle = function(on) {
                toHideBadges = (on !== undefined) ? on : !toHideBadges;

                if(toHideBadges) {
                    // Convert regular chat to legacy chat
                    var target = document.querySelector("#chat-messages");
                    legacyChatObserver.observe(target, {childList:true});
                    $("#chat-messages div.cm:not(.legacy-chat,.welcome,.update)").each(function() {
                        convertToLegacy($(this));
                    });
                } else {
                    // Conveting legacy chat to regular chat
                    legacyChatObserver.disconnect();
                    $("div.legacy-chat").each(function() {
                        convertFromLegacy($(this));
                    });
                    $("i.legacy-fake-icon").remove();
                }
                // Smooth scroll to bottom of chat div in case you're left high and dry in chat.
                $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
            };
            return { toggle: toggle };
        }());

        // Tastymojis by Nackloose and Fungus!
        // Suggestion box edit by git
        /*var tastyMojis = (function() {
         function getEmojiModule() {
         var mods = require.s.contexts._.defined;
         for(var mod in mods) {
         if(mods[mod] && typeof mods[mod].emojify == "function") {
         return mod;
         }
         }
         return undefined;
         }
         var emojiModule = getEmojiModule();
         if (!emojiModule) {
         Chat('error', 'Cannot load Bigger Emojis. Wait for TastyPlug to update soon!');
         return false;
         }
         var emojiCode = require(emojiModule);

         var emojiStyle = ".em{width:22px;height:22px;display:-moz-inline-stack;display:inline-block;*display:inline;zoom:1;vertical-align:middle;background-size:contain !important}",
         emojiCSS = '<style id="tastymoji-css" type="text/css">' + emojiStyle + '</style>';
         $('body').append(emojiCSS);

         var regx_arr = [], shortcut_arr = [], alt_arr = [];
         var emoji = {smile: 0, smiley: 1, grinning: 2, blush: 3, relaxed: 4, wink: 5, heart_eyes: 6, kissing_heart: 7, kissing_closed_eyes: 8, kissing: 9, kissing_smiling_eyes: 10, stuck_out_tongue_winking_eye: 11, stuck_out_tongue_closed_eyes: 12, stuck_out_tongue: 13, flushed: 14, grin: 15, pensive: 16, relieved: 17, unamused: 18, disappointed: 19, persevere: 20, cry: 21, joy: 22, sob: 23, sleepy: 24, disappointed_relieved: 25, cold_sweat: 26, sweat_smile: 27, sweat: 28, weary: 29, tired_face: 30, fearful: 31, scream: 32, angry: 33, rage: 34, triumph: 35, confounded: 36, laughing: 37, yum: 38, mask: 39, sunglasses: 40, sleeping: 41, dizzy_face: 42, astonished: 43, worried: 44, frowning: 45, anguished: 46, smiling_imp: 47, imp: 48, open_mouth: 49, grimacing: 50, neutral_face: 51, confused: 52, hushed: 53, no_mouth: 54, innocent: 55, smirk: 56, expressionless: 57, man_with_gua_pi_mao: 58, man_with_turban: 59, cop: 60, construction_worker: 61, guardsman: 62, baby: 63, boy: 64, girl: 65, man: 66, woman: 67, older_man: 68, older_woman: 69, person_with_blond_hair: 70, angel: 71, princess: 72, smiley_cat: 73, smile_cat: 74, heart_eyes_cat: 75, kissing_cat: 76, smirk_cat: 77, scream_cat: 78, crying_cat_face: 79, joy_cat: 80, pouting_cat: 81, japanese_ogre: 82, japanese_goblin: 83, see_no_evil: 84, hear_no_evil: 85, speak_no_evil: 86, skull: 87, alien: 88, poop: 89, fire: 90, sparkles: 91, star2: 92, dizzy: 93, boom: 94, anger: 95, sweat_drops: 96, droplet: 97, zzz: 98, dash: 99, ear: 100, eyes: 101, nose: 102, tongue: 103, lips: 104, "+1": 105, "-1": 106, ok_hand: 107, punch: 108, fist: 109, v: 110, wave: 111, hand: 112, open_hands: 113, point_up: 114, point_down: 115, point_right: 116, point_left: 117, raised_hands: 118, pray: 119, point_up_2: 120, clap: 121, muscle: 122, walking: 123, running: 124, dancer: 125, couple: 126, family: 127, two_men_holding_hands: 128, two_women_holding_hands: 129, couplekiss: 130, couple_with_heart: 131, dancers: 132, ok_woman: 133, no_good: 134, information_desk_person: 135, raising_hand: 136, massage: 137, haircut: 138, nail_care: 139, bride_with_veil: 140, person_frowning: 141, person_with_pouting_face: 142, bow: 143, tophat: 144, crown: 145, womans_hat: 146, athletic_shoe: 147, mans_shoe: 148, sandal: 149, high_heel: 150, boot: 151, shirt: 152, necktie: 153, womans_clothes: 154, dress: 155, running_shirt_with_sash: 156, jeans: 157, kimono: 158, bikini: 159, briefcase: 160, handbag: 161, pouch: 162, purse: 163, eyeglasses: 164, ribbon: 165, closed_umbrella: 166, lipstick: 167, yellow_heart: 168, blue_heart: 169, purple_heart: 170, green_heart: 171, heart: 172, broken_heart: 173, heartpulse: 174, heartbeat: 175, two_hearts: 176, sparkling_heart: 177, revolving_hearts: 178, cupid: 179, love_letter: 180, kiss: 181, ring: 182, gem: 183, bust_in_silhouette: 184, busts_in_silhouette: 185, speech_balloon: 186, feet: 187, thought_balloon: 188, dog: 189, wolf: 190, cat: 191, mouse: 192, hamster: 193, rabbit: 194, frog: 195, tiger: 196, koala: 197, bear: 198, pig: 199, pig_nose: 200, cow: 201, boar: 202, monkey_face: 203, monkey: 204, horse: 205, sheep: 206, elephant: 207, panda_face: 208, penguin: 209, bird: 210, baby_chick: 211, hatched_chick: 212, hatching_chick: 213, chicken: 214, snake: 215, turtle: 216, bug: 217, honeybee: 218, ant: 219, beetle: 220, snail: 221, octopus: 222, shell: 223, tropical_fish: 224, fish: 225, dolphin: 226, whale: 227, whale2: 228, cow2: 229, ram: 230, rat: 231, water_buffalo: 232, tiger2: 233, rabbit2: 234, dragon: 235, racehorse: 236, goat: 237, rooster: 238, dog2: 239, pig2: 240, mouse2: 241, ox: 242, dragon_face: 243, blowfish: 244, crocodile: 245, camel: 246, dromedary_camel: 247, leopard: 248, cat2: 249, poodle: 250, paw_prints: 251, bouquet: 252, cherry_blossom: 253, tulip: 254, four_leaf_clover: 255, rose: 256, sunflower: 257, hibiscus: 258, maple_leaf: 259, leaves: 260, fallen_leaf: 261, herb: 262, ear_of_rice: 263, mushroom: 264, cactus: 265, palm_tree: 266, evergreen_tree: 267, deciduous_tree: 268, chestnut: 269, seedling: 270, blossom: 271, globe_with_meridians: 272, sun_with_face: 273, full_moon_with_face: 274, new_moon_with_face: 275, new_moon: 276, waxing_crescent_moon: 277, first_quarter_moon: 278, waxing_gibbous_moon: 279, full_moon: 280, waning_gibbous_moon: 281, last_quarter_moon: 282, waning_crescent_moon: 283, last_quarter_moon_with_face: 284, first_quarter_moon_with_face: 285, moon: 286, earth_africa: 287, earth_americas: 288, earth_asia: 289, volcano: 290, milky_way: 291, stars: 292, star: 293, sunny: 294, partly_sunny: 295, cloud: 296, zap: 297, umbrella: 298, snowflake: 299, snowman: 300, cyclone: 301, foggy: 302, rainbow: 303, ocean: 304, bamboo: 305, gift_heart: 306, dolls: 307, school_satchel: 308, mortar_board: 309, flags: 310, fireworks: 311, sparkler: 312, wind_chime: 313, rice_scene: 314, jack_o_lantern: 315, ghost: 316, santa: 317, christmas_tree: 318, gift: 319, tanabata_tree: 320, tada: 321, confetti_ball: 322, balloon: 323, crossed_flags: 324, crystal_ball: 325, movie_camera: 326, camera: 327, video_camera: 328, vhs: 329, cd: 330, dvd: 331, minidisc: 332, floppy_disk: 333, computer: 334, iphone: 335, phone: 336, telephone_receiver: 337, pager: 338, fax: 339, satellite: 340, tv: 341, radio: 342, sound: 343, speaker: 345, mute: 346, bell: 347, no_bell: 348, loudspeaker: 349, mega: 350, hourglass_flowing_sand: 351, hourglass: 352, alarm_clock: 353, watch: 354, unlock: 355, lock: 356, lock_with_ink_pen: 357, closed_lock_with_key: 358, key: 359, mag_right: 360, bulb: 361, flashlight: 362, high_brightness: 363, low_brightness: 364, electric_plug: 365, battery: 366, mag: 367, bathtub: 368, bath: 369, shower: 370, toilet: 371, wrench: 372, nut_and_bolt: 373, hammer: 374, door: 375, smoking: 376, bomb: 377, gun: 378, hocho: 379, pill: 380, syringe: 381, moneybag: 382, yen: 383, dollar: 384, pound: 385, euro: 386, credit_card: 387, money_with_wings: 388, calling: 389, "e-mail": 390, inbox_tray: 391, outbox_tray: 392, envelope: 393, email: 394, incoming_envelope: 395, postal_horn: 396, mailbox: 397, mailbox_closed: 398, mailbox_with_mail: 399, mailbox_with_no_mail: 400, postbox: 401, "package": 402, pencil: 403, page_facing_up: 404, page_with_curl: 405, bookmark_tabs: 406, bar_chart: 407, chart_with_upwards_trend: 408, chart_with_downwards_trend: 409, scroll: 410, clipboard: 411, calendar: 412, date: 413, card_index: 414, file_folder: 415, open_file_folder: 416, scissors: 417, pushpin: 418, paperclip: 419, black_nib: 420, pencil2: 421, straight_ruler: 422, triangular_ruler: 423, closed_book: 424, green_book: 425, blue_book: 426, orange_book: 427, notebook: 428, notebook_with_decorative_cover: 429, ledger: 430, books: 431, book: 432, bookmark: 433, name_badge: 434, microscope: 435, telescope: 436, newspaper: 437, art: 438, clapper: 439, microphone: 440, headphones: 441, musical_score: 442, musical_note: 443, notes: 444, musical_keyboard: 445, violin: 446, trumpet: 447, saxophone: 448, guitar: 449, space_invader: 450, video_game: 451, black_joker: 452, flower_playing_cards: 453, mahjong: 454, game_die: 455, dart: 456, football: 457, basketball: 458, soccer: 459, baseball: 460, tennis: 461, "8ball": 462, rugby_football: 463, bowling: 464, golf: 465, mountain_bicyclist: 466, bicyclist: 467, checkered_flag: 468, horse_racing: 469, trophy: 470, ski: 471, snowboarder: 472, swimmer: 473, surfer: 474, fishing_pole_and_fish: 475, coffee: 476, tea: 477, sake: 478, baby_bottle: 479, beer: 480, beers: 481, cocktail: 482, tropical_drink: 483, wine_glass: 484, fork_and_knife: 485, pizza: 486, hamburger: 487, fries: 488, poultry_leg: 489, meat_on_bone: 490, spaghetti: 491, curry: 492, fried_shrimp: 493, bento: 494, sushi: 495, fish_cake: 496, rice_ball: 497, rice_cracker: 498, rice: 499, ramen: 500, stew: 501, oden: 502, dango: 503, egg: 504, bread: 505, doughnut: 506, custard: 507, icecream: 508, ice_cream: 509, shaved_ice: 510, birthday: 511, cake: 512, cookie: 513, chocolate_bar: 514, candy: 515, lollipop: 516, honey_pot: 517, apple: 518, green_apple: 519, tangerine: 520, lemon: 521, cherries: 522, grapes: 523, watermelon: 524, strawberry: 525, peach: 526, melon: 527, banana: 528, pear: 529, pineapple: 530, sweet_potato: 531, eggplant: 532, tomato: 533, corn: 534, house: 535, house_with_garden: 536, school: 537, office: 538, post_office: 539, hospital: 540, bank: 541, convenience_store: 542, love_hotel: 543, hotel: 544, wedding: 545, church: 546, department_store: 547, european_post_office: 548, city_sunrise: 549, city_sunset: 550, japanese_castle: 551, european_castle: 552, tent: 553, factory: 554, tokyo_tower: 555, japan: 556, mount_fuji: 557, sunrise_over_mountains: 558, sunrise: 559, statue_of_liberty: 561, bridge_at_night: 562, carousel_horse: 563, ferris_wheel: 564, fountain: 565, roller_coaster: 566, ship: 567, sailboat: 568, speedboat: 569, rowboat: 570, anchor: 571, rocket: 572, airplane: 573, seat: 574, helicopter: 575, steam_locomotive: 576, tram: 577, station: 578, mountain_railway: 579, bullettrain_front: 580, bullettrain_side: 582, light_rail: 583, metro: 584, monorail: 585, train: 586, railway_car: 587, trolleybus: 588, bus: 589, oncoming_bus: 590, blue_car: 591, oncoming_automobile: 592, car: 593, taxi: 594, oncoming_taxi: 595, articulated_lorry: 596, truck: 597, rotating_light: 598, police_car: 599, oncoming_police_car: 600, fire_engine: 601, ambulance: 602, minibus: 603, bike: 604, aerial_tramway: 605, suspension_railway: 606, mountain_cableway: 607, tractor: 608, barber: 609, busstop: 610, ticket: 611, vertical_traffic_light: 612, traffic_light: 613, warning: 614, construction: 615, beginner: 616, fuelpump: 617, izakaya_lantern: 618, slot_machine: 619, hotsprings: 620, moyai: 621, circus_tent: 622, performing_arts: 623, round_pushpin: 624, triangular_flag_on_post: 625, jp: 626, kr: 627, de: 628, cn: 629, us: 630, fr: 631, es: 632, it: 633, ru: 634, uk: 635, one: 636, two: 637, three: 638, four: 639, five: 640, six: 641, seven: 642, eight: 643, nine: 644, zero: 645, keycap_ten: 646, 1234: 647, hash: 648, symbols: 649, arrow_up: 650, arrow_down: 651, arrow_left: 652, arrow_right: 653, capital_abcd: 654, abcd: 655, abc: 656, arrow_upper_right: 657, arrow_upper_left: 658, arrow_lower_right: 659, arrow_lower_left: 660, left_right_arrow: 661, arrow_up_down: 662, arrows_counterclockwise: 663, arrow_backward: 664, arrow_forward: 665, arrow_up_small: 666, arrow_down_small: 667, leftwards_arrow_with_hook: 668, arrow_right_hook: 669, information_source: 670, rewind: 671, fast_forward: 672, arrow_double_up: 673, arrow_double_down: 674, arrow_heading_down: 675, arrow_heading_up: 676, ok: 677, twisted_rightwards_arrows: 678, repeat: 679, repeat_one: 680, "new": 681, up: 682, cool: 683, free: 684, ng: 685, signal_strength: 686, cinema: 687, koko: 688, u6307: 689, u7a7a: 690, u6e80: 691, u5408: 692, u7981: 693, ideograph_advantage: 694, u5272: 695, u55b6: 696, u6709: 697, u7121: 698, restroom: 699, mens: 700, womens: 701, baby_symbol: 702, wc: 703, potable_water: 704, put_litter_in_its_place: 705, parking: 706, wheelchair: 707, no_smoking: 708, u6708: 709, u7533: 710, sa: 711, m: 712, passport_control: 713, baggage_claim: 714, left_luggage: 715, customs: 716, accept: 717, secret: 718, congratulations: 719, cl: 720, sos: 721, id: 722, no_entry_sign: 723, underage: 724, no_mobile_phones: 725, do_not_litter: 726, "non-potable_water": 727, no_bicycles: 728, no_pedestrians: 729, children_crossing: 730, no_entry: 731, eight_spoked_asterisk: 732, sparkle: 733, negative_squared_cross_mark: 734, white_check_mark: 735, eight_pointed_black_star: 736, heart_decoration: 737, vs: 738, vibration_mode: 739, mobile_phone_off: 740, a: 741, b: 742, ab: 743, o2: 744, diamond_shape_with_a_dot_inside: 745, loop: 746, recycle: 747, aries: 748, taurus: 749, gemini: 750, cancer: 751, leo: 752, virgo: 753, libra: 754, scorpius: 755, sagittarius: 756, capricorn: 757, aquarius: 758, pisces: 759, ophiuchus: 760, six_pointed_star: 761, atm: 762, chart: 763, heavy_dollar_sign: 764, currency_exchange: 765, copyright: 766, registered: 767, tm: 768, x: 769, bangbang: 770, interrobang: 771, heavy_exclamation_mark: 772, question: 773, grey_exclamation: 774, grey_question: 775, o: 776, top: 777, end: 778, back: 779, on: 780, soon: 781, arrows_clockwise: 782, clock12: 783, clock1230: 784, clock1: 785, clock130: 786, clock2: 787, clock230: 788, clock3: 789, clock330: 790, clock4: 791, clock430: 792, clock5: 793, clock530: 794, clock6: 795, clock630: 796, clock7: 797, clock730: 798, clock8: 799, clock830: 800, clock9: 801, clock930: 802, clock10: 803, clock1030: 804, clock11: 805, clock1130: 806, heavy_multiplication_x: 807, heavy_plus_sign: 808, heavy_minus_sign: 809, heavy_division_sign: 810, spades: 811, hearts: 812, clubs: 813, diamonds: 814, white_flower: 815, 100: 816, heavy_check_mark: 817, ballot_box_with_check: 818, radio_button: 819, link: 820, curly_loop: 821, wavy_dash: 822, part_alternation_mark: 823, trident: 824, black_medium_square: 825, white_medium_square: 826, black_medium_small_square: 827, white_medium_small_square: 828, black_small_square: 829, white_small_square: 830, small_red_triangle: 831, black_square_button: 832, white_square_button: 833, black_circle: 834, white_circle: 835, red_circle: 836, large_blue_circle: 837, small_red_triangle_down: 838, white_large_square: 839, black_large_square: 840, large_orange_diamond: 841, large_blue_diamond: 842, small_orange_diamond: 843, small_blue_diamond: 844, bowtie: 845, feelsgood: 846, finnadie: 847, goberserk: 848, godmode: 849, hurtrealbad: 850, metal: 851, neckbeard: 852, octocat: 853, rage1: 854, rage2: 855, rage3: 856, rage4: 857, shipit: 858, suspect: 859, trollface: 860};
         var shortcuts = {"&gt;:(": "angry", "&gt;XD": "astonished", ":DX": "bowtie", "&lt;/3": "broken_heart", ":$": "confused", X$: "confounded", ":~(": "cry", ":[": "disappointed", ":~[": "disappointed_relieved", XO: "dizzy_face", ":|": "expressionless", "8|": "flushed", ":(": "frowning", ":#": "grimacing", ":D": "smile", "&lt;3": "heart", "&lt;3)": "heart_eyes", "O:)": "innocent", ":~)": "joy", ":*": "kissing", ":&lt;3": "kissing_heart", "X&lt;3": "kissing_closed_eyes", XD: "laughing", ":O": "open_mouth", "Z:|": "sleeping", ":)": "smiley", ":/": "confused", T_T: "sob", ":P": "stuck_out_tongue", "X-P": "stuck_out_tongue_closed_eyes", ";P": "stuck_out_tongue_winking_eye", "B-)": "sunglasses", "8D": "sunglasses", "~:(": "sweat", "~:)": "sweat_smile", XC: "tired_face", "&gt;:/": "unamused", ";)": "wink"};
         var alt_names = {footprints: "feet", gb: "uk", raised_hand: "hand", runner: "running", shit: "poop", hankey: "poop", red_car: "car", tshirt: "shirt", train2: "bullettrain_front", thumbsup: "+1", thumbsdown: "-1", telephone: "phone", memo: "pencil", open_book: "book", lantern: "izakaya_lantern", satisfied: "laughing", shoe: "athletic_shoe", bee: "honeybee", exclamation: "heavy_exclamation_mark", envelope_with_arrow: "email", collision: "boom", crescent_moon: "moon", boat: "sailboat", facepunch: "punch", squirrel: "shipit"};
         var realEmojis = emojiCore.emojify, validTypes = ['ios','android','twitter'];
         var emoji_path = 'https://fungustime.pw/tastymoji/img';

         function stripRegex(e) {
         return(e + "").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
         }
         for (var k in emoji) {
         regx_arr.push(k);
         }
         for (var k in shortcuts) {
         shortcut_arr.push(stripRegex(k));
         }
         for (var k in alt_names) {
         alt_arr.push(stripRegex(k));
         }
         var shortReg = new RegExp("(\\s|^)(" + shortcut_arr.join('|') + ")(?=\\s|$)", "g");
         var altReg = new RegExp('(:' + alt_arr.join(':|:') + ':)', 'gi');
         var emojiReg = new RegExp('(:' + (regx_arr.join(':|:')).replace(/[-[\]{}()*+?.,\\^$#\s]/g, "\\$&") + ':)', 'gi');

         function tastyMoji(s) {
         s = s.replace(shortReg, function(a, b, c) {
         return " :" + shortcuts[c] + ": ";
         }).replace(altReg, function(a) {
         return " :" + alt_names[a.toLowerCase().replace(/:/g, "")] + ": ";
         });
         return s.replace(emojiReg, function(a, b) {
         return '<span class="em" title="' + b.replace(/:/g, "").toLowerCase() + '" style="background:url(' + emoji_path + "/" + settings.emojitype + '/' + emoji[b.toLowerCase().replace(/:/g, "")] + '.svg);"></span>';
         });
         }
         // suggestion box by git
         var suggestBox = document.querySelector('#chat-suggestion-items');
         var suggestions = new MutationObserver(function(mutations) {
         mutations.forEach(function(mutation) {
         // can't iterate a cleaner way because a nodelist isnt a true array
         for (var i = 0; i < mutation.addedNodes.length; ++i) {
         var item = mutation.addedNodes[i];
         if (item.classList.contains("emo")) { // it's just a phase, mom
         var emote = item.querySelector(".value").innerHTML;
         item.querySelector(".image").innerHTML = tastyMoji(emote);
         }
         }
         });
         });

         function changeEmojify(on) {
         emojiCore.emojify = on ? tastyMoji : realEmojis;
         on ? suggestions.observe(suggestBox, {childList: true}) : suggestions.disconnect();
         }
         function getEmojify() {
         return emojiCore.emojify;
         }

         return {
         toggle: changeEmojify,
         valid: validTypes,
         emojify: getEmojify
         };
         })();*/

        var z = function() {
            if (typeof API === 'undefined' || !API.enabled) setTimeout(z,200);
            else startup();
        };
        z();
    })(window.jQuery);
