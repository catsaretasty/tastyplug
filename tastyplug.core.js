/*
 * TastyPlug, a plug.dj extension
 * Original work Copyright (c) 2013-2015 by Olivier Houle (Fungus)
 * Legacy Chat option made by Git! Tastymojis by Nackloose and Fungus.
 * Please do not copy or modify without my (Oliver Houle's) permission.
 *
 * Modified work Copyright (C) 2016 Chip (git)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Array.prototype.isArray = true;
if (typeof window.tastyPlugShutDown != 'undefined') window.tastyPlugShutDown();
(function($) {
    var afktime = Date.now(),
        drag = false,
        hidevideo = false,
        joincd = false,
        version = '3.9.2',
        commands = {},
        tos = {},
        boothcd = false,
        hover = false,
        room = location.pathname,
        lastchat, curvotes = {},
        emotes = {},
        settings = {
            show: true,
            autowoot: false,
            autojoin: false,
            chatmentions: false,
            joinnotifs: {
                toggle: false,
                ranks: false,
                friends: false,
                lvl1: false
            },
            msgs: [],
            lastPM: null,
            uipos: {
                'top': '54px',
                'left': '0'
            },
            boothalert: false,
            boothnotify: 3,
            legacychat: false,
            histalert: false,
            mehtrack: false,
            chatimgs: false,
            emotes: false,
            hidden: false,
            mention: 0,
            tastymojis: false,
            emojiset: "ios"
        };

    function startup() {
        loadSettings();
        loadUI();
        loadEvents();
        loadEmotes();
        tos.roomcheck = setInterval(function() {
            if (location.pathname != room) {
                clearInterval(tos.roomcheck);
                room = location.pathname;
                a = function() {
                    if ($('#room-loader').length) {
                        setTimeout(a, 200);
                    } else {
                        if (getRank(API.getUser()) < 2) {
                            $('#tp-histalert').remove();
                            $('#tp-mehtrack').remove();
                            $('#tp-joinlvl1').remove();
                        }
                    }
                };
                a();
            }
        }, 1000);
        if (room == '/tastycat') eta();
        if (settings.autowoot) woot();
        if (settings.autojoin) {
            afkCheck();
            if (!getLocked() && API.getWaitListPosition() == -1 && API.getDJ() && API.getDJ().id != API.getUser().id) join();
        }
        legacyChat.toggle(settings.legacychat);
        tastyMojis.toggle();
        Chat('init', 'TastyPlug v' + version + ' now with dank emotes!');
        console.log('[TastyPlug v' + version + '] now with dank emotes!');
    };

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
    };

    function loadUI() {
        $('head').append('<style type=text/css id=tastyplug-css>#tastyplug-ui{-moz-user-select:none;-webkit-user-select:none;position:absolute;width:150px;border-radius:10px;background-color:#1C1F25;background-image:-webkit-gradient(linear,left bottom,left top,color-stop(0,#1C1F25),color-stop(1,#282D33));background-image:-o-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-moz-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-webkit-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:-ms-linear-gradient(top,#1C1F25 0,#282D33 100%);background-image:linear-gradient(to top,#1C1F25 0,#282D33 100%);z-index:9;padding-bottom:1.5px;color:#DDD}#tastyplug-ui a{color:inherit;text-decoration:none}.tastyplug-icon{position:relative;float:right}#tastyplug-ui .tp-toggle{color:#F04F30}#tastyplug-ui .tp-toggle.button-on{color:#1CC7ED}#tp-title{margin:0 15px;padding:3px 0;color:#A874FC;font-size:19px;cursor:move}.tp-mainbutton,.tp-secbutton{margin:0 15px;padding:2px 0 3px;font-size:15px;border-top:1px solid rgba(56,60,68,.85);cursor:pointer}.tp-highlight{background-color:rgba(168,116,252,.33)}.tp-secbutton{padding-left:8px}#tastyplug-ui .icon-drag-handle{position:relative;float:right;top:3px;height:14px;width:14px;background-position:-183px -113px}#waitlist-button .eta{left:45px;font-size:10px}#chat-messages .tastyplug-pm .icon{left:5.5px;top:6px}#chat-pm-button{left:-3px}#chat-messages div.tastyplug-pm.mention{background:linear-gradient(135deg,#FF00CB 0,#0a0a0a 13%,#0a0a0a 100%)}#chat-messages div.tastyplug-pm.mention:nth-child(2n+1){background:linear-gradient(135deg,#FF00CB 0,#111317 13%,#111317 100%)}#chat div[class*=" tp-"],#chat div[class^=tp-]{background-color:#0a0a0a}#chat div[class*=" tp-"]:nth-child(2n+1),#chat div[class^=tp-]:nth-child(2n+1){background-color:#111317}#chat-messages .tastyplug-pm .msg .from span.un{color:#FF00CB;font-weight:700}#user-lists .list.room .user .icon-meh{left:auto;right:8px;top:-1px}#chat-messages [data-cid|="3946454"]{background-color:#2D002D}#chat .mention:nth-child(2n+1)[data-cid|="3946454"],#chat .message:nth-child(2n+1)[data-cid|="3946454"],#chat-messages .emote:nth-child(2n+1)[data-cid|="3946454"]{background-color:#240024}#chat .emote[data-cid|="3946454"] .text,#chat .mention[data-cid|="3946454"] .text,#chat .message[data-cid|="3946454"] .text{font-weight:700;color:#CFCFCF}#chat .emote[data-cid|="3946454"] .text{font-style:normal}div.badge-box img.tastyplug-icon{padding:2px}#chat .cm.tp-info .text,#chat .cm.tp-info div.from.tastyplug span.un{color:#1CC7ED}#chat .cm.tp-info .text span{color:#EEE}#chat .cm.tp-error .text,#chat .cm.tp-error div.from.tastyplug span.un{color:#C42E3B}#chat .cm.tp-init .text,#chat .cm.tp-init div.from.tastyplug span.un{color:#D1D119}#chat .cm.tp-join-admin .text,#chat .cm.tp-join-admin div.from.tastyplug span.un{color:#1CC7ED}#chat .cm.tp-join-ba .text,#chat .cm.tp-join-ba div.from.tastyplug span.un{color:#088C30}#chat .cm.tp-join-host .text,#chat .cm.tp-join-host div.from.tastyplug span.un{color:#D1D119}#chat .cm.tp-join-cohost .text,#chat .cm.tp-join-cohost div.from.tastyplug span.un{color:#F59425}#chat .cm.tp-join-staff .text,#chat .cm.tp-join-staff div.from.tastyplug span.un{color:#C322E3}#chat .cm.tp-join-friend .text,#chat .cm.tp-join-friend div.from.tastyplug span.un{color:#009CDD}#chat .cm.tp-join-lvl1 .text,#chat .cm.tp-join-lvl1 div.from.tastyplug span.un{color:#FFDD6F}.tp-img{width:auto;height:auto;max-width:270px;max-height:250px}.legacy-chat .tastyplug-img-delete{top:26px}.tastyplug-img-delete{position:absolute;top:42px;right:4px;background-color:#F04F30;padding:0 3px;cursor:pointer;z-index:1}#playback .tp-video-hide,#playback.tp-video-hide{height:0!important}.tp-emote{display:inline-block;vertical-align:top}#chat-messages [data-cid|="3946454"] .bdg{background:url(https://tastyplug.tastycat.org/images/tastybot.png) no-repeat;}#chat-messages [data-cid|="3946454"] .badge-box{background:rgba(0,0,0,0)!important;}.icon-tp-pm{background:url(https://tastyplug.tastycat.org/images/private-message.png) no-repeat}</style>');
        $('body').append('<div id=tp-room style=position:absolute;top:54px;left:0></div><div id=tastyplug-ui><div id=tp-title>TastyPlug <img class=tastyplug-icon src=https://tastyplug.tastycat.org/images/tastybot.png></div><div class="tp-mainbutton tp-toggle button-on" id=tp-autowoot><span>Autowoot</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-autojoin><span>Autojoin</span></div><div class="tp-mainbutton tp-toggle" id=tp-hidevideo><span>Hide Video</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-legacychat><span>Legacy Chat</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-boothalert><span>Booth Alert</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-histalert><span>History Alert</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-mehtrack><span>Meh Tracker</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-chatimgs><span>Chat Images</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-emotes><span>Cust. Emotes</span></div>' +
            '<div class="tp-mainbutton tp-toggle button-on" id=tp-emojis><div class="icon icon-drag-handle"></div><span>Tastymojis</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojiios><span>iOS</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojitwitter><span>Twitter</span></div><div class="tp-secbutton tp-secmojis tp-toggle" id=tp-emojiemojione><span>Emojione</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-mentions><div class="icon icon-drag-handle"></div><span>Chat Mentions</span></div><div class="tp-secbutton tp-secmention" id=tp-addmention><span>Add</span></div><div class="tp-secbutton tp-secmention" id=tp-delmention><span>Delete</span></div><div class="tp-secbutton tp-secmention" id=tp-listmention><span>List</span></div><div class="tp-mainbutton tp-toggle button-on" id=tp-joinnotifs><div class="icon icon-drag-handle"></div><span>Join Notifs.</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinranks><span>Ranks</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinfriends><span>Friends</span></div><div class="tp-secbutton tp-secjoin tp-toggle button-on" id=tp-joinlvl1><span>Level 1s</span></div><a href=https://emotes.tastycat.org target=_blank><div class=tp-mainbutton id=tp-listemotes><span>Emotes List</span></div></a></div>');
        if (room == '/tastycat') $('#waitlist-button').append('<span class="eta"></span>');
        if (room == '/hummingbird-me') $('#tp-autojoin').remove();

        if (!settings.autowoot) $('#tp-autowoot').removeClass('button-on');
        if (!settings.autojoin) $('#tp-autojoin').removeClass('button-on');
        if (!settings.boothalert) $('#tp-boothalert').removeClass('button-on');
        if (!settings.legacychat) $('#tp-legacychat').removeClass('button-on');
        if (!settings.histalert) $('#tp-histalert').removeClass('button-on');
        if (!settings.mehtrack) $('#tp-mehtrack').removeClass('button-on');
        if (!settings.chatimgs) $('#tp-chatimgs').removeClass('button-on');
        if (!settings.emotes) $('#tp-emotes').removeClass('button-on');
        if (!settings.tastymojis) $('#tp-emojis').removeClass('button-on');
        $('#tp-emoji' + settings.emojiset).addClass('button-on');
        if (!settings.chatmentions) $('#tp-mentions').removeClass('button-on');
        if (!settings.joinnotifs.toggle) $('#tp-joinnotifs').removeClass('button-on');
        if (!settings.joinnotifs.ranks) $('#tp-joinranks').removeClass('button-on');
        if (!settings.joinnotifs.friends) $('#tp-joinfriends').removeClass('button-on');
        if (!settings.joinnotifs.lvl1) $('#tp-joinlvl1').removeClass('button-on');
        if (!settings.show) {
            $('.tp-mainbutton').hide();
            $('#tastyplug-ui').css('padding-bottom', '0');
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
        $('body').append('<audio id="default-sound"><source src="https://cdn.plug.dj/_/static/sfx/badoop.801a12ca13864e90203193b2c83c019c03a447d1.mp3"></audio>');
    };

    function loadEvents() {
        API.on({
            'chat': eventChat,
            'userJoin': eventJoin,
            'waitListUpdate': eventWLUpd,
            'advance': eventDjAdv,
            'chatCommand': eventCommand,
            'voteUpdate': refreshMehs
        });
        API.on('voteUpdate', eventVote);
        $(window).resize(resize);
        $('#users-button:not(.selected)').click(refreshMehs);
        //make it draggable
        var dragopts = {
            distance: 20,
            handle: '#tp-title',
            containment: '#tp-room',
            scroll: false,
            start: function() {
                drag = true
            },
            stop: function(e, ui) {
                drag = false;
                settings.uipos = ui.position;
                saveSettings();
            }
        };
        var tplugUI = $('#tastyplug-ui');
        if (typeof tplugUI.draggable != "undefined") tplugUI.draggable(dragopts);
        //hover over song title
        $('#now-playing-media').hover(
            function() {
                hover = true;
                if (API.getMedia()) {
                    var left = $('#now-playing-bar').position().left + 74;
                    $('body').append('<div id="tooltip" class="tp-songtitle" style="top:6px;left:' + left + 'px"><span>' +
                        API.getMedia().author + ' - ' + API.getMedia().title + '</span><div class="corner"></div></div>');
                }
            },
            function() {
                hover = false;
                $('#tooltip.tp-songtitle').remove();
            }
        );


        //highlight ui buttons
        $('.tp-mainbutton,.tp-secbutton').hover(
            function() {
                $(this).addClass('tp-highlight')
            },
            function() {
                $(this).removeClass('tp-highlight')
            }
        );
        //tp title
        $('#tp-title').mouseup(function() {
            if (!drag) {
                settings.show = !settings.show;
                if (!settings.show) {
                    $('#tastyplug-ui').css('padding-bottom', '0');
                    $('.tp-mainbutton').css('border-top', '0');
                    $('.tp-secbutton').css('border-top', '0');
                }
                $('#tastyplug-ui .tp-mainbutton').slideToggle(function() {
                    if (settings.show) {
                        $('#tastyplug-ui').css('padding-bottom', '');
                        $('.tp-mainbutton').css('border-top', '');
                        $('.tp-secbutton').css('border-top', '');
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
        $('#tp-mehtrack').click(function() {
            settings.mehtrack = !settings.mehtrack;
            $(this).toggleClass('button-on');
            saveSettings();
        });
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
        $('#tp-histalert').click(function() {
            settings.histalert = !settings.histalert;
            $(this).toggleClass('button-on');
            saveSettings();
        });
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
        $('#tp-emojis .icon-drag-handle').click(function() {
            $('.tp-secmojis').slideToggle();
        });
        $('#tp-emojis span').click(function() {
            settings.tastymojis = !settings.tastymojis;
            $(this).parent().toggleClass('button-on');
            if (tastyMojis) tastyMojis.toggle();
            saveSettings();
        });
        $('#tp-emojiios').click(function() {
            if (settings.emojiset != "ios") {
                $('#tp-emoji' + settings.emojiset).removeClass('button-on');
                settings.emojiset = "ios";
                $(this).toggleClass('button-on');
                tastyMojis.toggle(true);
                saveSettings();
            }
        });
        $('#tp-emojitwitter').click(function() {
            if (settings.emojiset != "twitter") {
                $('#tp-emoji' + settings.emojiset).removeClass('button-on');
                settings.emojiset = "twitter";
                $(this).toggleClass('button-on');
                tastyMojis.toggle(true);
                saveSettings();
            }
        });
        $('#tp-emojiemojione').click(function() {
            if (settings.emojiset != "emojione") {
                $('#tp-emoji' + settings.emojiset).removeClass('button-on');
                settings.emojiset = "emojione";
                $(this).toggleClass('button-on');
                tastyMojis.toggle(true);
                saveSettings();
            }
        });
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
                settings.msgs.splice(settings.msgs.indexOf(a), 1);
                Chat('info', 'Removed "' + _.escape(a) + '" from the chat mentions list');
                saveSettings();
            } else Chat('error', 'That word isn\'t in the mentions list!');
        });
        $('#tp-listmention').click(function() {
            var a = settings.msgs,
                b = [];
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
        $('#tp-joinlvl1').click(function() {
            settings.joinnotifs.lvl1 = !settings.joinnotifs.lvl1;
            $(this).toggleClass('button-on');
            saveSettings();
        });
        $('#tp-joinnotifs .icon-drag-handle').click(function() {
            $('.tp-secjoin').slideToggle();
        });
    };

    function fetchJSON(url, callback) {
        if (!callback || typeof callback != "function") return;

        $.ajax({
            type: "GET",
            url: url
        }).success(function(data) {
            callback(null, data);
        }).fail(function(data) {
            callback("no json for you");
        });
    }

    function loadEmotes() {
        var regex = /{image_id}/,
            links = {
                tp: "https://emotes.tastycat.org/emotes.json",
                rcs: "https://code.radiant.dj/require/emotes/radiant_emotes.json",
                twitch: "https://twitchemotes.com/api_cache/v2/global.json",
                twitchSub: "https://twitchemotes.com/api_cache/v2/subscriber.json"
            };

        fetchJSON(links.twitchSub, function(err, data) {
            if (err) Chat('error', 'Could not load the Twitch Subscriber emotes. Refresh and/or try again later.');
            else {
                for (var channel in data.channels)
                    if (data.channels.hasOwnProperty(channel)) {
                        var e = data.channels[channel].emotes;
                        for (var i = 0; i < e.length; i++)
                            emotes[e[i].code.toLowerCase()] = data.template.small.replace(regex, e[i].image_id);
                    }
            }
            fetchJSON(links.twitch, function(err, data) {
                if (err) Chat('error', 'Could not load the Twitch Global emotes. Refresh and/or try again later.');
                else
                    for (var i in data.emotes)
                        emotes[i.toLowerCase()] = data.template.small.replace(regex, data.emotes[i].image_id);
                fetchJSON(links.rcs, function(err, data) {
                    if (err) Chat('error', 'Could not load the RCS emotes. Refresh and/or try again later.');
                    else
                        for (var i in data.emotes)
                            for (var j in data.emotes[i])
                                emotes[j.toLowerCase()] = "https://cdn.radiant.dj/rcs/emotes/img/" + data.emotes[i][j];
                    fetchJSON(links.tp, function(err, data) {
                        if (err) Chat('error', 'Could not load the tastyPlug emotes. Refresh and/or try again later.');
                        else
                            for (var i in data.emotes)
                                emotes[i.toLowerCase()] = data.emotes[i];
                    });
                });
            });
        });
    }
    var isShuttingDown = false;
    window.tastyPlugShutDown = function() {
        isShuttingDown = true;
        API.off({
            'chat': eventChat,
            'userJoin': eventJoin,
            'waitListUpdate': eventWLUpd,
            'advance': eventDjAdv,
            'chatCommand': eventCommand,
            'voteUpdate': refreshMehs
        });
        API.off('voteUpdate', eventVote);
        $(window).off('resize', resize);
        $('#users-button').off('click', refreshMehs);
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
        legacyChat.toggle(false);

        $('#tastymojis-css').remove();
        for (var i in tos) clearInterval(tos[i]);
        saveSettings();
        console.log('[TastyPlug v' + version + '] shut down.');
    };

    function chatSound() {
        if ($('.icon-chat-sound-on').length) {
            document.getElementById('default-sound').play();
        }
    }

    function eventChat(a) {
        if (!a.cid || a.cid == lastchat) return;
        lastchat = a.cid;
        var msg = $('.cid-' + a.cid).parent();
        if (settings.emotes) {
            var txt = msg.find('.text'),
                html = txt.html();
            var chat = $('#chat-messages'),
                d = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
            html = custEmotes(html, a.message);
            txt.html(html);
            if (d) chat.scrollTop(chat[0].scrollHeight);
        }
        if (settings.chatimgs && a.message.toLowerCase().indexOf('nsfw') == -1) {
            var txt = msg.find('.text'),
                txts = txt.text().trim().split(' ');
            for (var i = 0; i < txts.length; i++) {
                if (/^https?:\/\//i.test(txts[i])) {
                    if (/.(gif|png|jpe?g)/i.test(txts[i])) return checkImg(txts[i], txt);
                    else if (/.(webm|gifv)$/i.test(txts[i])) return checkVid(txts[i], txt);
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
    };

    function eventJoin(a) {
        if (!settings.joinnotifs.toggle) return;
        if (!a.username) return;
        if (!settings.joinnotifs.ranks && !settings.joinnotifs.friends && !settings.joinnotifs.lvl1) return;
        var b, rank = getRank(a),
            str = '';
        if (rank) switch (rank) {
            case 10:
                b = 'admin';
                break;
            case 8:
                b = 'ba';
                break;
            case 5:
                b = 'host';
                break;
            case 4:
                b = 'cohost';
                break;
            case 3:
            case 2:
            case 1:
                b = 'staff';
                break;
            default:
                b = 'undef';
                break;
        }
        else if (settings.joinnotifs.friends && a.friend) b = 'friend';
        else if (settings.joinnotifs.lvl1 && getRank(API.getUser()) >= 2 && a.level == 1) b = 'lvl1';
        if (b) {
            if (b == 'lvl1') str += '[Lvl 1 - ID: ' + a.id + '] ';
            str += _.escape(a.username) + ' joined the room';
            Chat('join-' + b, str);
        }
    };

    function eventWLUpd() {
        if (settings.autojoin && !getLocked() && API.getWaitListPosition() == -1) join();
        if (settings.boothalert && API.getWaitListPosition() < settings.boothnotify && API.getWaitListPosition() != -1 && !boothcd) {
            chatSound();
            Chat('info', '[Booth Alert] It\'s almost your turn to DJ! Make sure to pick a song!');
            boothcd = true;
        }
    };

    function eventDjAdv(a) {
        if (settings.autojoin && !getLocked() && API.getWaitListPosition() == -1) join();
        if (settings.autowoot) setTimeout(woot, (Math.floor(Math.random() * 10) + 1) * 1000);
        if (!a.dj) return;
        if (a.dj.id == API.getUser().id) boothcd = false;
        if (settings.histalert && getRank(API.getUser()) >= 2 && a.media) {
            var hist = API.getHistory();
            for (var i = 0; i < hist.length; i++) {
                if (hist[i].media.cid == a.media.cid) {
                    Chat('error', 'This song is on the history! (played ' + (i + 1) + ' song' + (i == 0 ? '' : 's') + ' ago)');
                    chatSound();
                    break;
                }
            }
        }
        curvotes = {};
        if (hover) {
            $('#tooltip.tp-songtitle').remove();
            if (API.getMedia()) {
                var left = $('#now-playing-bar').position().left + 74;
                $('body').append('<div id="tooltip" class="tp-songtitle" style="top:6px;left:' + left + 'px"><span>' +
                    API.getMedia().author + ' - ' + API.getMedia().title + '</span><div class="corner"></div></div>');
            }
        }
    };

    function eventCommand(a) {
        var cmd = a.trim().substr(1).split(' ')[0].toLowerCase();
        var data = {
            uid: API.getUser().id,
            un: API.getUser().username,
            message: a.trim(),
            room: room
        };
        if (commands[cmd]) commands[cmd](data);
    };

    function eventVote(a) {
        if (settings.mehtrack && getRank(API.getUser()) >= 2 && a.vote == -1 && !curvotes[a.user.id]) {
            curvotes[a.user.id] = true;
            Chat('error', _.escape(a.user.username) + ' meh\'d the song!');
        }
    };

    function refreshMehs() {
        if ($('#users-button').hasClass('selected') && $('.button.room').hasClass('selected')) {
            $('#user-lists .list.room i.icon.icon-meh').remove();
            var users = $(API.getUsers()).filter(function() {
                return this.vote == -1 && !this.curated;
            });
            users.each(function(i) {
                $('#user-lists .list.room .user span').filter(function() {
                    return $(this).text() == users[i].username;
                }).parent().append('<i class="icon icon-meh"></i>');
            });
        }
    };

    commands.opcheck = function(data) {
        var media = API.getNextMedia().media;
        API.sendChat('!opcheck cid ' + media.format + ' ' + media.cid);
    };

    commands.lock = function(a) {
        if (getRank(API.getUser()) >= 3) API.moderateLockWaitList(true);
    };

    commands.unlock = function(a) {
        if (getRank(API.getUser()) >= 3) API.moderateLockWaitList(false);
    };

    commands.cycle = function(a) {
        if (getRank(API.getUser()) >= 3) $('.cycle-toggle').click();
    };

    commands.ban = function(a) {
        if (getRank(API.getUser()) < 3) return;
        var user = getUser(a.message.substr(a.message.indexOf('@') + 1));
        if (!user) return Chat('error', 'User not found.');
        if (getRank(user)) return Chat('error', 'You shouldn\'t ban those with ranks!');
        API.moderateBanUser(user.id, 0, API.BAN.PERMA);
    };

    commands.kick = function(a) {
        if (getRank(API.getUser()) < 2) return;
        var msg = a.message.split(' '),
            user, dur;
        user = getUser(msg.slice(1, msg.length - 1).join(' ').substr(1));
        if (!user) return Chat('error', 'User not found.');
        if (user.role || user.gRole) return Chat('error', 'You shouldn\'t kick those with ranks!');
        dur = msg[msg.length - 1] == 'day' ? API.BAN.DAY : API.BAN.HOUR;
        API.moderateBanUser(user.id, 0, dur);
    };

    commands.skip = function(a) {
        if (getRank(API.getUser()) >= 2) API.moderateForceSkip();
    };

    commands.mute = function(a) {
        var b = a.message.split(' ');
        if (b.length == 1) return false;
        var c, user;
        switch (b[b.length - 1].toLowerCase()) {
            case 's':
            case 'short':
            case '15':
                c = API.MUTE.SHORT;
                user = getUser(b.slice(1, b.length - 1).join(' ').substr(1));
                break;
            case 'm':
            case 'medium':
            case '30':
                c = API.MUTE.MEDIUM;
                user = getUser(b.slice(1, b.length - 1).join(' ').substr(1));
                break;
            case 'l':
            case 'long':
            case '45':
                c = API.MUTE.LONG;
                user = getUser(b.slice(1, b.length - 1).join(' ').substr(1));
                break;
            default:
                c = API.MUTE.SHORT;
                user = getUser(b.slice(1).join(' ').substr(1));
        }
        if (!user) return Chat('error', 'User not found.');
        if (getRank(user)) return Chat('error', 'You can\'t mute those with ranks!');
        API.moderateMuteUser(user.id, 1, c);
    };

    commands.commands = function() {
        if (room == '/tastycat') Chat('info', 'Tastybot commands: <a href="http://tastycat.org/tastybot/" target="_blank">Click Here</a>');
        Chat('info', 'TastyPlug commands: <span>' + Object.keys(commands).join(', ') + '</span>');
    };

    commands.whois = function(a) {
        var user = getUser(a.message.split(' ').slice(1).join(' ').substr(1)),
            rank;
        if (!user) return Chat('error', 'User not found.');
        var pos = API.getWaitListPosition(user.id);
        switch (getRank(user)) {
            case 10:
                rank = 'plug.dj Admin';
                break;
            case 8:
                rank = 'Brand Ambassador';
                break;
            case 5:
                rank = 'Host';
                break;
            case 4:
                rank = 'Co-Host';
                break;
            case 3:
                rank = 'Manager';
                break;
            case 2:
                rank = 'Bouncer';
                break;
            case 1:
                rank = 'Resident DJ';
                break;
            case 0:
                rank = 'User';
                break;
            default:
                rank = 'Unknown';
        }
        if (API.getDJ().id == user.id) pos = 'Currently DJing';
        else if (pos == -1) pos = 'Not on list';
        else pos++;
        Chat('info', 'Username: <span>' + user.username + '</span><br>ID: <span>' + user.id +
            '</span><br>Rank: <span>' + rank + '</span><br>Level: <span>' + user.level + '</span><br>Wait List: <span>' + pos + '</span>');
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
        settings.uipos = {
            'top': '54px',
            'left': '0'
        };
        $('#tastyplug-ui').css(settings.uipos);
        saveSettings();
        Chat('info', 'UI position reset');
    };

    commands.hidden = function() {
        settings.hidden = !settings.hidden;
        saveSettings();
        Chat('info', 'Hidden emotes ' + (settings.hidden ? 'enabled!' : 'disabled!'));
    };

    commands.profile = function(a) {
        var b = a.message.substr(10),
            link = '@/',
            name, link, slug;
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

    function Chat(type, m) {
        if ($('#chat-button').css('display') == 'block') {
            var chat = $('#chat-messages'),
                a = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28,
                d = $('#chat-timestamp-button .icon').attr('class').substr(21),
                user = "TastyPlug",
                f = new Date().toTimeString().substr(0, 5);
            if (d == '12') {
                var g = parseInt(f),
                    h = g >= 12 ? 'pm' : 'am',
                    i = g % 12 == 0 ? '12' : g % 12;
                f = i + f.substr(2) + h;
            }
            if (f.charAt(0) == '0') f = f.substr(1);
            chat.append('<div class="cm message tastyplug-message tp-' + type + '"><div class="badge-box"><img class="tastyplug-icon" src="https://tastyplug.tastycat.org/images/tastybot.png"/></div><div class="msg"><div class="from tastyplug"><span class="un">' + user + '</span><span class="timestamp" style="display: inline;">' + f + '</span></div><div class="text">' + m + '</div></div></div>');
            if (a) chat.scrollTop(chat[0].scrollHeight);
            if (chat.children().length >= 512) chat.children().first().remove();
        } else API.chatLog(m.replace(/<br>/g, ', ').replace(/<\/?span>/g, ''), true);
    }

    function eta() {
        tos.eta = setInterval(function() {
            var pos = API.getWaitListPosition();
            var str = pos == -1 ? '' : ('ETA: ' + getTime(pos * 1000 * 60 * 4 + API.getTimeRemaining() * 1000));
            $('#waitlist-button').find('.eta').text(str);
        }, 10000);
    }

    function resize() {
        var room = $('#tp-room'),
            rpos = room.position(),
            rwidth = room.width(),
            rheight = room.height(),
            ui = $('#tastyplug-ui'),
            uipos = ui.position(),
            uiwidth = ui.width(),
            uiheight = ui.height(),
            a = Object.keys(rpos),
            uicont = {
                width: $('.app-right').position().left,
                height: $('.app-right').height()
            };
        $('#tp-room').css(uicont);
        for (var i = 0; i < a.length; i++)
            if (uipos[a[i]] < rpos[a[i]]) ui.css(a[i], rpos[a[i]]);
        uipos = $('#tastyplug-ui').position();
        if (uiwidth + uipos.left > rwidth) ui.css('left', rwidth - uiwidth);
        if (uiheight + uipos.top > rheight) ui.css('top', rheight - uiheight);
        settings.uipos = ui.position();
        if (settings.fullscreen) fullScreen();
        saveSettings();
    }

    function getUser(a) {
        a = a.trim().toLowerCase();
        var b = API.getUsers();
        for (var i = 0; i < b.length; i++)
            if (b[i].username.toLowerCase() == a) return b[i];
        return null;
    }

    function getTime(a) {
        a = Math.floor(a / 60000);
        var minutes = (a - Math.floor(a / 60) * 60);
        var hours = (a - minutes) / 60;
        var str = '';
        str += hours + 'h';
        str += minutes < 10 ? '0' : '';
        str += minutes;
        return str;
    }

    function getRank(a) {
        if (a.gRole) switch (a.gRole) {
            case 5:
                return 10;
            case 4:
            case 3:
            case 2:
                return 8;
            default:
                return 6;
        }
        return a.role;
    }

    function urlFix(a) {
        if (a.indexOf('http') == -1) return a;
        a = a.split(' ');
        for (var i = 0; i < a.length; i++)
            if (!a[i].indexOf('http')) a[i] = '<a href="' + a[i] + '" target="_blank">' + a[i] + '</a>';
        return a.join(' ');
    }

    function afkCheck() {
        if (settings.autojoin) tos.afkInt = setInterval(function() {
            if (Date.now() - afktime >= 12E5) {
                settings.autojoin = false;
                $('#tp-autojoin').removeClass('button-on');
                clearInterval(tos.afkInt);
            }
        }, 6E4);
        else clearInterval(tos.afkInt);
    }

    function checkImg(a, b) {
        var img = new Image();
        img.onload = function() {
            img.className += 'tp-img';
            var c = b.html().replace('<a href="' + a + '" target="_blank">' + a + '</a>', '<br><a href="' + a + '" target="_blank">' + img.outerHTML + '</div></a>');
            if (c.indexOf('<br>') == 0) c = c.substr(4);
            b.parent().append('<div class="tastyplug-img-delete" style="display:none">X</div>');
            b.parent().parent().hover(
                function() {
                    $(this).find('.tastyplug-img-delete').css('display', 'block')
                },
                function() {
                    $(this).find('.tastyplug-img-delete').css('display', 'none')
                }
            );
            b.parent().find('.tastyplug-img-delete').click(function() {
                var a = $(this).parent().find('img')[0].src;
                $(this).parent().find('br').remove();
                $(this).parent().find('img').parent().append(a).find('img').remove();
                $(this).remove();
            });
            var chat = $('#chat-messages'),
                d = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
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
            function() {
                $(this).find('.tastyplug-img-delete').css('display', 'block')
            },
            function() {
                $(this).find('.tastyplug-img-delete').css('display', 'block')
            }
        );
        b.parent().find('.tastyplug-img-delete').click(function() {
            var a = $(this).parent().find('video a').first().text();
            $(this).parent().find('br').remove();
            $(this).parent().find('video').parent().append('<a href="' + a + '" target="_blank">' + a + '</a>').find('video').remove();
            $(this).remove();
        });
        var chat = $('#chat-messages'),
            e = chat.scrollTop() > chat[0].scrollHeight - chat.height() - 28;
        b.html(d);
        if (e) chat.scrollTop(chat[0].scrollHeight);
    }

    function custEmotes(txt, message) {
        var keys = Object.keys(emotes);
        if (!keys.length || typeof txt != 'string') return;
        var em = message.match(/:[^:\s]+:/g);
        if (!em) return txt;
        for (var i = 0; i < em.length; i++) {
            var emlow = em[i].substring(1, em[i].length - 1).toLowerCase();
            if (keys.indexOf(emlow) != -1) {
                var msg = txt.split(em[i]),
                    res = msg[0];
                for (var k = 1; k < msg.length; k++) {
                    res += '<img class="tp-emote" title="' + emlow + '" src="' + emotes[emlow] + '" />';
                    res += msg[k];
                }
                txt = res;
            }
        }
        return txt;
    }

    function join() {
        if (!joincd && room != '/hummingbird-me') {
            API.djJoin();
            joincd = true;
            setTimeout(function() {
                joincd = false
            }, 5000);
        }
    }

    function saveSettings() {
        localStorage.setItem('tastyPlugSettings', JSON.stringify(settings))
    }

    function getLocked() {
        return $('.lock-toggle .icon').hasClass('icon-locked')
    }

    function woot() {
        $('#woot').click()
    }

    var tastyMojis = (function() {
        var sizeCSS = "#chat span.emoji-sizer{width:22px;height:22px;}";
        var toggle = function(type) {
            if (!type) {
                if (!settings.tastymojis) {
                    $("style#tastymojis-css").remove();
                } else {
                    $("head").append('<style id="tastymojis-css" type="text/css">' + sizeCSS + (settings.emojiset != "ios" ? "span.emoji-inner{background:url('https://tastyplug.tastycat.org/images/" + settings.emojiset + ".png')" : "") + '</style>');
                }
            } else {
                if (settings.tastymojis) $("#tastymojis-css").text(sizeCSS + (settings.emojiset != "ios" ? "span.emoji-inner{background:url('https://tastyplug.tastycat.org/images/" + settings.emojiset + ".png')" : ""));
            }
        }
        return {
            toggle: toggle
        };
    })();

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
            if (message.children("div.subscriber")[0]) {
                icon = $('<i class="icon icon-chat-subscriber legacy-fake-icon"></i>');

                icon.insertAfter(badge);
            } else if (message.children("div.staff, div.dj")[0]) {
                var staffIcon = icon.last().clone();
                staffIcon.addClass("legacy-fake-icon");
                staffIcon.insertAfter(badge);
                staffIcon.show();
            } else if (message.children("div.you")[0]) {
                var baIcon = icon.filter(".icon-chat-ambassador");
                var legacyIcon = baIcon.length ? baIcon : icon.last();
                icon.not(legacyIcon).hide();
                legacyIcon.insertAfter(badge);
                legacyIcon.show();
            } else if (message.children("div.ambassador")[0]) {
                icon = $('<i class="icon icon-chat-ambassador legacy-fake-icon"></i>');
                icon.insertAfter(badge);
            } else if (message.children("div.from.pm")[0]) {
                icon = $('<i class="icon icon-tp-pm legacy-fake-icon"></i>');
                icon.insertAfter(badge);
            } else if (message.children("div.admin")[0]) {
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
            if (icon.length) {
                messageData.prepend(icon);
            }
            messageData.children().show();
            messageText.insertAfter(messageData);
            node.removeClass("legacy-chat");
        };

        var legacyChatObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (toHideBadges) {
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

            if (toHideBadges) {
                // Convert regular chat to legacy chat
                var target = document.querySelector("#chat-messages");
                legacyChatObserver.observe(target, {
                    childList: true
                });
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

        return {
            toggle: toggle
        };
    }());

    var tastyplugGuestMessageSent = false;
    var z = function() {
        if (!isShuttingDown) {
            if (typeof API === 'undefined' || !API.enabled) {
                if (API.getUser().guest) {
                    if (!tastyplugGuestMessageSent) {
                        Chat('error', 'Must be logged in to use tastyplug!');
                        console.log('[TastyPlug v' + version + '] Can\'t load as a guest.  Checking if logged in every in 2 seconds.');
                        tastyplugGuestMessageSent = true;
                    }
                    setTimeout(z, 2000);
                } else {
                    setTimeout(z, 200);
                }
            } else startup();
        }
    };

    z();
})(window.jQuery);