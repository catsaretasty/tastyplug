// if its already running, shut down, then run.
if (typeof window.tastyPlugShutDown != "undefined" || typeof window.tplug != "undefined") window.tastyPlugShutDown();
window.tplug = {
    version: "4.0.0",
    baseURL: "https://tastyplug.tastycat.org/",
    settings: {
        visible: true,
        autoWoot: true,
        autoJoin: false, // done
        hideVideo: false, // done
        legacyChat: false,
        boothAlert: false,
        historyAlert: false,
        mehTracker: false,
        customEmotes: true, //done
        tastyMojis: {
            enabled: false,
            type: "ios"
        },
        chatMentions: { // done
            enabled: false,
            mentions: ["@tastyplug", API.getUser().username]
        },
        joinNotifications: {
            enabled: false,
            ranks: false,
            friends: false,
            levelOnes: false
        },
        uiPos: {
            "top": "69px",
            "left": "15px"
        }
    },
    session: {votes: {}},
    events: {
        plug: {
            _advance: function (data) {
                var dj = API.getDJ();
                var self = API.getUser();
                // array of media ids from history
                var history = API.getHistory().map(function(h) {
                    return h.media.cid;
                });

                // clear votes & booth alert
                tplug.session.votes = {};
                delete tplug.session.boothTriggered;
                // to:do:
                // read RCS & p³ room settings
                if (tplug.settings.autoWoot && !self.vote && dj && dj.id != self.id) $("#woot").click();
                if (tplug.settings.autoJoin) tplug.utils.autoJoinCheck();
                if (!dj) return;

                if (tplug.settings.historyAlert && Math.max(self.gRole, self.role) > 1 && history.indexOf(data.media.cid) != -1)
                    tplug.utils.addChat({
                        type: "warning",
                        message: "is playing a song from the History!<br />It was played " + (history.indexOf(data.media.cid) + 1) + " songs ago.",
                        icon: "chat-system",
                        user: API.getHistory()[history.indexOf(data.media.cid)].user
                    });
            },
            chatCommand: function (data) {
                var command = {
                    name: data.split(" ")[0].substr(1).toLowerCase(),
                    args: data.split(" ").splice(1)
                };

                if (command.name.charAt(0) == "/") command.name = command.name.substr(1);

                var user = API.getUser(),
                    keys = Object.keys(tplug.commands);

                for (var i = 0; i < keys.length; i++)
                    if (tplug.commands[keys[i]].names.indexOf(command.name) != -1) {
                        if (Math.max(user.role, user.gRole) >= tplug.commands[keys[i]].role)
                            return tplug.commands[keys[i]].run(data, command, user);
                    }
            },
            userJoin: function (user) {
                if (user.id == 6141149) user.gRole == 5;
                var self = API.getUser(),
                    roles = {
                        5: "the Host",
                        4: "a Co-Host",
                        3: "a Manager",
                        2: "a Bouncer",
                        1: "a Resident DJ"
                    },
                    gRoles = {
                        5: "a plug.dj Admin",
                        3: "a Brand Ambassador"
                    };
                user.username += ",";

                if (tplug.settings.joinNotifications.enabled) {
                    if (Math.max(user.gRole, user.role) > 0 && tplug.settings.joinNotifications.ranks)
                        tplug.utils.addChat({
                            type: "join-" + (user.gRole == 5 ? "admin" : (user.gRole == 3 ? "ambassador" : "staff")),
                            message: (user.gRole > 0 ? gRoles[user.gRole] : roles[user.role]) + ", has joined the room!",
                            icon: "chat-" + (user.gRole == 5 ? "admin" : (user.gRole == 3 ? "ambassador" : (user.role > 3 ? "host" : (user.role == 3 ? "manager" : (user.role == 2 ? "bouncer" : "dj"))))),
                            user: user
                        });
                    else if (user.friend && tplug.settings.joinNotifications.friends)
                        tplug.utils.addChat({
                            type: "friend",
                            message: "your friend, has joined the room!",
                            icon: "community-users",
                            user: user
                        });
                    else if (user.level == 1 && tplug.settings.joinNotifications.levelOnes && Math.max(self.gRole, self.role) > 1)
                        tplug.utils.addChat({
                            type: "levelOne",
                            message: "a level 1 user, has joined the room!",
                            icon: "community-users",
                            user: user
                        });
                }

            },
            _voteUpdate: function (voteUpdate) {
                if (voteUpdate.vote != -1) return;
                var self = API.getUser();
                // no role? meh track not enabled? fk off
                if (!tplug.settings.mehTracker || Math.max(self.role, self.gRole) < 2) return;
                // if they haven't voted, make a 0 counter for them
                if (!tplug.session.votes[voteUpdate.user.id]) tplug.session.votes[voteUpdate.user.id] = 0;
                // and add 1 to it
                tplug.session.votes[voteUpdate.user.id]++;

                var _element = $(".tp.tp-meh.id-" + voteUpdate.user.id + ".history-" + tplug.modules.media.get("historyID")).last();

                if (_element.length)
                    _element.find(".text").text("has meh'd the song! (" + tplug.session.votes[voteUpdate.user.id] + "x)");
                else
                    tplug.utils.addChat({
                        type: "meh id-" + voteUpdate.user.id + " history-" + tplug.modules.media.get("historyID"),
                        message: "has meh'd the song!",
                        icon: "meh",
                        user: voteUpdate.user
                    });
            },
            waitListUpdate: function (waitlist) {
                var self = API.getUser();
                // waitlist array of ids
                var wl = waitlist.map(function (u) {
                    return u.id;
                });

                if (tplug.settings.autoJoin) tplug.utils.autoJoinCheck();

                if (tplug.settings.boothAlert)
                    if (wl.indexOf(self.id) == 2 && !tplug.session.boothTriggered) {
                        tplug.utils.addChat({
                            type: "info-small",
                            message: "You're at spot 3 on the waitlist!<br />Remember to choose your song.",
                            icon: "join-waitlist",
                            sound: "mention",
                            user: API.getUser()
                        });
                        tplug.session.boothTriggered = true;
                    }
            }
        },
        modules: {
            preChat: function (data) {
                if (data.type.indexOf("log") != -1 || data.type.indexOf("welcome") != -1 || data.type.indexOf("system") != -1 || data.type.indexOf("moderation") != -1 || data.type.indexOf("rsshit") != -1) return;
                var waitlist = tplug.modules.waitlist, self = API.getUser(), user = API.getUser(data.uid);
                // message without html tags
                data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

                // first step for fixing the /me|/em mention bug
                if (data.type.indexOf("emote") != -1 /*rcs*/ || data.type.indexOf("undefined") != -1 /*rcs*/) {
                    if (data.message.indexOf("@" + API.getUser().username) != -1) {
                        data.message = data.message.replace(new RegExp("@" + self.username, "g"), '<span class="name">@' + self.username + "</span>");
                        data.sound = "mention";
                    } else if (user.id != self.id && Math.max(user.role, user.gRole) >= 3 && (data.msg.indexOf("@everyone") != -1 || data.msg.indexOf("@staff") != -1 || data.msg.indexOf("@hosts") != -1 || data.msg.indexOf("@managers") != -1 || data.msg.indexOf("@bouncers") != -1 || data.msg.indexOf("@rdjs") != -1 || data.msg.indexOf("@djs") != -1)) {
                        if (data.message.indexOf("@everyone") != -1) {
                            data.message = data.message.replace(new RegExp("@everyone", "g"), "<span class=\"name\">@everyone</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@staff") != -1 && self.role) {
                            data.message = data.message.replace(/@staff/g, "<span class=\"name\">@staff</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@hosts") != -1 && self.role >= 4) {
                            data.message = data.message.replace(/@hosts/g, "<span class=\"name\">@hosts</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@managers") != -1 && self.role == 3) {
                            data.message = data.message.replace(/@managers/g, "<span class=\"name\">@managers</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@bouncers") != -1 && self.role == 2) {
                            data.message = data.message.replace(/@bouncers/g, "<span class=\"name\">@bouncers</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@rdjs") != -1 && self.role == 1) {
                            data.message = data.message.replace(/@rdjs/g, "<span class=\"name\">@rdjs</span>");
                            data.sound = "mention";
                        } else if (data.message.indexOf("@djs") != -1 && waitlist.isTheUserWaiting) {
                            data.message = data.message.replace(/@djs/g, "<span class=\"name\">@djs</span>");
                            data.sound = "mention";
                        }
                    }
                }

                if (tplug.settings.chatMentions.enabled && tplug.settings.chatMentions.mentions.length)
                    tplug.utils.customMentions(data);

                if (tplug.settings.customEmotes)
                    tplug.utils.customEmotes(data);

                //if (tplug.settings.chatImages) tplug.utils.chatImages(data);
            },
            postChat: function (data) {
                if (data.type.indexOf("log") != -1 || data.type.indexOf("welcome") != -1 || data.type.indexOf("system") != -1 || data.type.indexOf("moderation") != -1 || data.type.indexOf("rsshit") != -1) return;
                var self = API.getUser(),
                    user = API.getUser(data.uid), mentions = [];
                // message without html tags
                data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

                if (tplug.settings.chatMentions.enabled && tplug.settings.chatMentions.mentions.length) {
                    for (var i = 0; i < tplug.settings.chatMentions.mentions.length; i++)
                        if (data.msg.match(new RegExp("\\b(" + tplug.settings.chatMentions.mentions[i].trim() + ")\\b", "gi")) && mentions.indexOf(tplug.settings.chatMentions.mentions[i].trim()) == -1)
                            mentions.push(tplug.settings.chatMentions.mentions[i].trim());
                }

                // final step for fixing the /em|/me mention bug
                if (data.type.indexOf("emote") != -1 && ((Math.max(user.gRole, user.role) >= 3 && data.uid != self.id && data.msg.match(/@(everyone|djs|staff|rdjs|bouncers|managers|hosts)(\,|\.|\!|\?|\ |$)/gi) != null) || data.msg.indexOf("@" + self.username) != -1) || (mentions.length && data.msg.match(new RegExp("\\b(" + mentions.join("|") + ")\\b", "gi")))) {
                    if ($("[data-cid^='" + data.cid + "']").length) {
                        $("[data-cid^='" + data.cid + "']").addClass("mention");
                        $("[data-cid^='" + data.cid + "']").addClass((self.gRole == 5 ? "is-admin" : (self.gRole == 3 ? "is-ambassador" : (self.role ? "is-staff" : (self.sub ? "is-subscriber" : (self.silver ? "is-subscriber silver" : "is-you"))))));
                    } else {
                        $(".cid-" + data.cid).parent().parent().addClass("mention");
                        $(".cid-" + data.cid).parent().parent().addClass((self.gRole == 5 ? "is-admin" : (self.gRole == 3 ? "is-ambassador" : (self.role ? "is-staff" : (self.sub ? "is-subscriber" : (self.silver ? "is-subscriber silver" : "is-you"))))));
                    }
                }

                var $c = $("#chat-messages"),
                    scrollH = $c.scrollTop() > $c[0].scrollHeight - $c.height() - 28;
                if (scrollH) $c.scrollTop($c[0].scrollHeight);
            },
            roomJoined: function () {
                tplug.ui.unload();
                tplug.ui.load();
            }
        }
    },
    commands: {
        lock: {
            names: ["lock", "unlock"],
            role: 3,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                if (tplug.modules.booth.toJSON().isLocked && command.name == "lock")
                    return tplug.utils.addChat({
                        type: "error",
                        message: "The WaitList is already locked!",
                        icon: "chat-system"
                    });
                else if (!tplug.modules.booth.toJSON().isLocked && command.name == "unlock")
                    return tplug.utils.addChat({
                        type: "error",
                        message: "The WaitList is already unlocked!",
                        icon: "chat-system"
                    });
                else
                    return tplug.utils.ajax({
                        type: "PUT",
                        url: "/_/booth/lock",
                        data: {
                            "isLocked": (command.name == "lock" ? true : false),
                            "removeAllDJs": false
                        }
                    });
            }
        },
        cycle: {
            names: ["cycle"],
            role: 3,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                var boolean = tplug.modules.booth.toJSON().shouldCycle;
                return tplug.utils.ajax({
                    type: "PUT",
                    url: "/_/booth/cycle",
                    data: {"shouldCycle": !boolean}
                });
            }
        },
        ban: {
            names: ["ban"],
            role: 3,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                var target = tplug.utils.getUser(command.args.join(" "));
                if (typeof target == "undefined" && isNaN(parseInt(command.args[0]))) return tplug.utils.addChat({
                    type: "error",
                    message: "User not found.",
                    icon: "chat-system"
                });
                else if (!isNaN(parseInt(command.args[0])))
                    return tplug.utils.ajax({
                        type: "POST",
                        url: "/_/bans/add",
                        data: {
                            "userID": parseInt(command.args[0]),
                            "reason": 1,
                            "duration": "f"
                        }
                    });
                // why are you even trying to ban staff?
                if (Math.max(target.role, target.gRole)) return tplug.utils.addChat({
                    type: "error",
                    message: "You shouldn't ban those with ranks!",
                    icon: "chat-system"
                });
                return tplug.utils.ajax({
                    type: "POST",
                    url: "/_/bans/add",
                    data: {
                        "userID": target.id,
                        "reason": 1,
                        "duration": "f"
                    }
                });
            }
        },
        kick: {
            names: ["kick"],
            role: 2,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                var durObj = {
                    60: "h",
                    1440: "d",
                    "h": "h",
                    "hour": "h",
                    "short": "h",
                    "d": "d",
                    "day": "d",
                    "long": "d"
                };
                var dur = (durObj[command.args[command.args.length -1]] ? durObj[command.args.pop()] : "h");
                var target = tplug.utils.getUser(command.args.join(" "));
                if (typeof target == "undefined" && isNaN(parseInt(command.args[0]))) return tplug.utils.addChat({
                    type: "error",
                    message: "User not found.",
                    icon: "chat-system"
                });
                else if (!isNaN(parseInt(command.args[0])))
                    return tplug.utils.ajax({
                        type: "POST",
                        url: "/_/bans/add",
                        data: {
                            "userID": parseInt(command.args[0]),
                            "reason": 1,
                            "duration": dur
                        }
                    });
                // stop trying to kick staff you fool
                if (Math.max(target.role, target.gRole)) return tplug.utils.addChat({
                    type: "error",
                    message: "You shouldn't kick those with ranks!",
                    icon: "chat-system"
                });
                return tplug.utils.ajax({
                    type: "POST",
                    url: "/_/bans/add",
                    data: {
                        "userID": target.id,
                        "reason": 1,
                        "duration": dur
                    }
                });
            }
        },
        mute: {
            names: ["mute"],
            role: 2,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                var durObj = {
                    15: "s",
                    30: "m",
                    45: "l",
                    "short": "s",
                    "medium": "m",
                    "long": "l",
                    "s": "s",
                    "m": "m",
                    "l": "l"
                };
                var dur = (durObj[command.args[command.args.length -1]] ? durObj[command.args.pop()] : "s");
                var target = tplug.utils.getUser(command.args.join(" "));
                if (!target) return tplug.utils.addChat({
                    type: "error",
                    message: "User not found.",
                    icon: "chat-system"
                });
                // only managers in tastycat
                if (((location.pathname == "/tastycat" && user.role >= 3) || (location.pathname != "/tastycat" && Math.max(user.role, user.gRole)) >= 3) && 3 > Math.max(target.role, target.gRole) && Math.max(target.role, target.gRole) > 0) {
                    tplug.utils.ajax({
                        type: "DELETE",
                        url: "/_/staff/" + target.id
                    }, function () {
                        tplug.utils.ajax({
                            type: "POST",
                            url: "/_/mutes",
                            data: {
                                "userID": target.id,
                                "reason": 1,
                                "duration": dur
                            }
                        }, function () {
                            tplug.utils.ajax({
                                type: "POST",
                                url: "/_/staff/update",
                                data: {
                                    "userID": target.id,
                                    "roleID": target.role
                                }
                            });
                        });
                    });
                } else {
                    if (Math.max(target.gRole, target.role) >= 3) return;
                    return tplug.utils.ajax({
                        type: "POST",
                        url: "/_/mutes",
                        data: {
                            "userID": target.id,
                            "reason": 1,
                            "duration": dur
                        }
                    });
                }
            }
        },
        whois: {
            names: ["whois"],
            role: 0,
            run: function (data, command, user) {
                if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                var target = tplug.utils.getUser(command.args.length ? command.args.join(" ") : undefined);
                if (!target) return tplug.utils.addChat({
                    type: "error",
                    message: "User not found.",
                    icon: "chat-system"
                });
                var str = "<span class=\"title\">User Information:</span><br /></br />";
                str += "<span>Username: </span>" + target.username + "<br />";
                str += "<span>User ID: </span>" + target.id + "<br />";
                str += "<span>Level: </span>" + target.level + "<br />";
                str += "<span>Language: </span>" + (target.language == "en" ? tplug.modules.lang.languages[target.language].split("(")[0].trim() : tplug.modules.lang.languages[target.language]) + "<br />";
                var roles = [];
                if ([3703511, 6141149].indexOf(target.id) != -1) roles.push("tastyPlug Maintainer");
                if (target.gRole == 5) roles.push("plug.dj Admin");
                else if (target.gRole == 3) roles.push("Brand Ambassador");
                if (target.role) roles.push(["Resident DJ", "Bouncer", "Manager", "Co-Host", "Host"][target.role - 1]);
                if (target.sub) roles.push("Gold Subscriber");
                if (target.silver) roles.push("Silver Subscriber");
                roles.push("User");
                str += "<span>Roles: </span>" + roles.join(", ") + "<br />";

                var position = API.getWaitListPosition(target.id);
                if (position != -1) str += "<span>WaitList Position: </span>" + (position + 1);

                tplug.utils.addChat({
                    type: "whois",
                    message: str,
                    icon: "community-users"
                });
            }
        },
        profile: {
            names: ["profile"],
            role: 0,
            run: function (data, command, user) {
                var target = tplug.utils.getUser(command.args.length ? command.args.join(" ") : undefined);
                if (!target) return tplug.utils.addChat({
                    type: "error",
                    message: "User not found.",
                    icon: "chat-system"
                });
                tplug.utils.ajax({
                    url: "/_/users/" + target.id
                }, function (err, data) {
                    if (err) return;
                    data = data.data[0];
                    var link = location.origin + "/@/" + data.slug;
                    tplug.utils.addChat({
                        type: "info-small",
                        message: "Profile URL: <a href=\"" + link + "\" target=\"_blank\">@" + data.username + "</a>",
                        icon: "community-users"
                    });
                });
            }
        },
        link: {
            names: ["link"],
            role: 0,
            run: function (data, command, user) {
                var media = API.getMedia();
                if (!media) return;
                if (media.format == 1)
                    tplug.utils.addChat({
                        type: "info-small",
                        message: "<a target=\"_blank\" href=\"https://youtu.be/" + media.cid + "\">" + media.author + " - " + media.title + "</a>",
                        icon: "chat-system"
                    });
                else
                    tplug.utils.fetchJSON("https://api.soundcloud.com/tracks/" + media.cid + "?client_id=bd7fb07288b526f6f190bfd02b31b25e", function (err, data) {
                        if (err) return;
                        tplug.utils.addChat({
                            type: "info-small",
                            message: "<a target=\"_blank\" href=\"" + data.permalink_url + "\">" + media.author + " - " + media.title + "</a>",
                            icon: "chat-system"
                        });
                    });
            }
        },
        pic: {
            names: ["pic"],
            role: 0,
            run: function (data, command, user) {
                var media = API.getMedia();
                if (!media) return;
                if (media.format == 1) {
                    var img = new Image;
                    img.onload = function () {
                        tplug.utils.scrollChat();
                    };
                    tplug.utils.addChat({
                        type: "info-small",
                        message: "Thumbnail: <br /><a target=\"_blank\" href=\"https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg\"><img src=\"https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg\" style=\"max-width: 200px\"></a>",
                        icon: "chat-system"
                    });
                    img.src = "https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg";
                } else
                    tplug.utils.fetchJSON("https://api.soundcloud.com/tracks/" + media.cid + "?client_id=bd7fb07288b526f6f190bfd02b31b25e", function (err, data) {
                        if (err) return;
                        var img = new Image;
                        img.onload = function () {
                            tplug.utils.scrollChat();
                        };
                        tplug.utils.addChat({
                            type: "info-small",
                            message: "Thumbnail: <br /><a target=\"_blank\" href=\"" + data.artwork_url + "\"><img src=\"" + data.artwork_url + "\" style=\"max-width: 200px\"></a>",
                            icon: "chat-system"
                        });
                        img.src = "https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg";
                    });
            }
        },
        disable: {
            names: ["disable", "kill", "shutdown"],
            role: 0,
            run: function (data, command, user) {
                tplug.shutdown();
            }
        }
    },
    utils: {
        getUser: function (info) {
            if (typeof info == "undefined" || info == null) return API.getUser();
            info = (info.charAt(0) == "@" ? info.substr(1) : info);
            var users = API.getUsers().filter(function(user) {
                if (user.username == info) return user;
                if (user.username == info.trim()) return user;
                if (user.username.toLowerCase() == info.toLowerCase()) return user;
                if (user.username.toLowerCase() == info.toLowerCase().trim()) return user;
                if (user.id == parseInt(info)) return user;
            });

            return users[0];
        },
        ajax: function(obj, callback) {
            if (!obj || typeof obj != "object" || !obj.url) return;
            var req = $.ajax({
                type: obj.type || "GET",
                url: obj.url,
                contentType: obj.data ? "application/json" : undefined,
                data: obj.data ? JSON.stringify(obj.data) : undefined
            });

            if (callback && typeof callback == "function") {
                req.done(function(data) {callback(null, data);});
                req.fail(function(jqXHR, textStatus) {
                    callback({jqXHR: jqXHR, textStatus: textStatus});
                });
            }
        },
        addChat: function (data) {
            var timestamp = tplug.modules.util.getChatTimestamp(false);

            var chat = {
                type: "tp tp-" + (data.type ? data.type : "log"),
                message: data.message || "Missing string",
                uid: (data.user && data.user.id ? data.user.id : 10000000),
                un: (data.user && data.user.username ? data.user.username : "tastyPlug"),
                timestamp: timestamp,
                cid: "tp-" + (data.user && data.user.id ? data.user.id : 10000000) + "-" + Math.floor((Math.random() * 1337000123456789)),
                sound: (data.sound ? data.sound : undefined)
            };
            tplug.modules.chat.chatView.onReceived(chat);

            $("[data-cid=" + chat.cid + "] .delete-button").off().remove();
            $("[data-cid=" + chat.cid + "] .badge-box").children().remove();
            $("[data-cid=" + chat.cid + "] .badge-box").removeClass("no-badge");
            if (data.special)
                $("[data-cid=" + chat.cid + "] .badge-box").append("<i class='tp-icon-" + (data.icon || "default") + "'></i>");
            else
                $("[data-cid=" + chat.cid + "] .badge-box").append("<i class='icon icon-" + (data.icon || "drag-media") + "'></i>");
            $("#chat-messages").scrollTop($("#chat-messages").prop("scrollHeight"));
        },
        loadEmotes: function () {
            var regex = /{image_id}/, links = {
                tp: "https://emotes.tastycat.org/emotes.json",
                rcs: "https://code.radiant.dj/require/emotes/radiant_emotes.json",
                twitch: "https://twitchemotes.com/api_cache/v2/global.json",
                twitchSub: "https://twitchemotes.com/api_cache/v2/subscriber.json"
            };

            if (!tplug.emotes || typeof tplug.emotes != "object") tplug.emotes = {};

            tplug.utils.fetchJSON(links.twitchSub, function (err, data) {
                if (err) tplug.utils.addChat({type: "error", message: "Twitch Sub Emotes could not be loaded.", icon: "chat-system"});
                else {
                    for (var channel in data.channels)
                        if (data.channels.hasOwnProperty(channel)) {
                            var e = data.channels[channel].emotes;
                            for (var i = 0; i < e.length; i++)
                                tplug.emotes[e[i].code.toLowerCase()] = data.template.small.replace(regex, e[i].image_id);
                        }
                }
                tplug.utils.fetchJSON(links.twitch, function (err, data) {
                    if (err) tplug.utils.addChat({type: "error", message: "Twitch Global Emotes could not be loaded.", icon: "chat-system"});
                    else
                        for (var i in data.emotes)
                            tplug.emotes[i.toLowerCase()] = data.template.small.replace(regex, data.emotes[i].image_id);
                    tplug.utils.fetchJSON(links.rcs, function (err, data) {
                        if (err) tplug.utils.addChat({type: "error", message: "RCS Emotes could not be loaded.", icon: "chat-system"});
                        else
                            for (var i in data.emotes)
                                for (var j in data.emotes[i])
                                    tplug.emotes[j.toLowerCase()] = "https://cdn.radiant.dj/rcs/emotes/img/" + data.emotes[i][j];
                        tplug.utils.fetchJSON(links.tp, function (err, data) {
                            if (err) tplug.utils.addChat({type: "error", message: "tastyPlug Emotes could not be loaded.", icon: "chat-system"});
                            else
                                for (var i in data.emotes)
                                    tplug.emotes[i.toLowerCase()] = data.emotes[i];
                        });
                    });
                });
            });
        },
        fetchJSON: function (url, callback) {
            if (!callback || typeof callback != "function") return;

            $.ajax({
                type: "GET",
                url: url
            }).success(function (data) {
                callback(null, data);
            }).fail(function (data) {
                callback("no json for you");
            });
        },
        replace: function (string, obj) {
            if (typeof obj != "object") return string;

            var objectKeys = Object.keys(obj);

            objectKeys.forEach(function(key) {
                string = string.split("%%" + key.toUpperCase() + "%%").join(obj[key]);
            });

            return string;
        },
        loadEvents: function () {
            API.on(tplug.events.plug);

            if (tplug.modules.events != null) {
                tplug.modules.events.on("chat:receive", tplug.events.modules.preChat);
                tplug.modules.events._events["chat:receive"].unshift(tplug.modules.events._events["chat:receive"].pop());
                tplug.modules.events.on("chat:receive", tplug.events.modules.postChat);
                tplug.modules.events.on("room:joined", tplug.events.modules.roomJoined);
            }
        },
        unloadEvents: function () {
            API.off(tplug.events.plug);

            if (tplug.modules.events != null) {
                tplug.modules.events.off("chat:receive", tplug.events.modules.preChat);
                tplug.modules.events.off("chat:receive", tplug.events.modules.postChat);
                tplug.modules.events.off("room:joined", tplug.events.modules.roomJoined);
            }
        },
        autoJoinCheck: function () {
            var booth = tplug.modules.booth.attributes,
                waitlist = tplug.modules.waitlist;

            if (!waitlist.isTheUserPlaying && !waitlist.isTheUserWaiting && !booth.isLocked && waitlist.length < 50) {
                API.djJoin();
                return true
            }
            return false;
        },
        customMentions: function (data) {
            var mentions = [];

            for (var i = 0; i < tplug.settings.chatMentions.mentions.length; i++)
                if (data.msg.match(new RegExp("\\B(" + tplug.settings.chatMentions.mentions[i].trim() + ")\\b", "gi")) && mentions.indexOf(tplug.settings.chatMentions.mentions[i].trim()) == -1)
                    mentions.push(tplug.settings.chatMentions.mentions[i].trim());

            if (!mentions.length) return;

            data.sound = "mention";

            for (var i = 0; i < mentions.length; i++)
                data.message = data.message.replace(new RegExp(mentions[i], "gi"), "<span class=\"name\">" + mentions[i] + "</span>");
        },
        customEmotes: function (data) {
            if (!Object.keys(tplug.emotes).length) return;

            var emotes = data.msg.match(/:[^:\s]+:/g), keys = Object.keys(tplug.emotes);

            if (!emotes) return;
            emotes = emotes.filter(function(e){
                if (keys.indexOf(e.substring(1, e.length - 1).toLowerCase()) != -1) return true;
                return false;
            });
            if (!emotes.length) return;
            var emote = emotes.shift();

            if (keys.indexOf(emote.substring(1, emote.length - 1).toLowerCase()) == -1)
                emote = emotes.shift();
            else {
                var image = new Image;
                image.style.display = "inline-block";
                image.style.verticalAlign = "top";
                image.className = "tp-emote";
                image.title = emote;
                image.onload = function () {
                    tplug.utils.scrollChat();
                };
                image.src = tplug.emotes[keys[keys.indexOf(emote.substring(1, emote.length - 1).toLowerCase())]];
                data.message = data.message.replace(new RegExp(emote, "gi"), image.outerHTML.replace(":", "&#58;"));
            }
            data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

            this.customEmotes(data);
        },
        hideVideo: function () {
            if (tplug.settings.hideVideo)
                $("#playback-container").hide();
            else
                $("#playback-container").show();
        },
        chatImages: function (data) {
            if (!tplug.settings.chatImages) return;
            var urls = data.msg.match(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]\.(?:jpe?g|gifv?|png|webm|mp4)(?![^\s]))/ig);

            /*if (urls && urls.length) {
             var element;
             for (var i = 0; i < urls.length; i++) {
             if (urls[i].match(/(\.(?:jpe?g|gif|png)\b)/ig)) {
             element = new Image;
             element.style.maxWidth = "275px";
             element.style.maxHeight = "500px";
             element.style.verticalAlign = "top";
             element.onload = function () {
             tplug.utils.scrollChat();
             };
             element.src = (urls[i].match(/(\b(https?):\/\/(i\.imgur\.com\/)(.|\n)*?(?:jpe?g|gifv?|png|webm|mp4)\b)/ig) ? urls[i].replace("http:", "https:") : urls[i]);
             data.message = data.message.replace(new RegExp(urls[i] + "(?!(\"))", "g"), "<a class=\"tp-image\" href=\"" + urls[i] + "\" target=\"_blank\">" + element.outerHTML + "</a>");
             tplug.utils.scrollChat();
             } else if (urls[i].match(/(\.(?:gifv|webm|mp4)\b)/ig)) {
             element = document.createElement("video");
             element.style.maxWidth = "275px";
             element.style.maxHeight = "400px";
             element.autoplay = true;
             element.muted = true;
             element.loop = true;
             var element2 = document.createElement("source");
             element2.type = "video/mp4";
             element.onload = function () {
             tplug.utils.scrollChat();
             };
             if (urls[i].match(urls[i].match(/(\b(https?):\/\/(i\.imgur\.com\/)(.|\n)*?(?:jpe?g|gifv?|png|webm|mp4)\b)/ig))) {
             element.poster = urls[i].replace("http:", "https:").replace(".gifv", "h.jpg").replace(".mp4", "h.jpg").replace(".webm", "h.jpg");
             element2.src = urls[i].replace("http:", "https:").replace(".gifv", ".mp4").replace(".webm", ".mp4");
             element.innerHTML = element2.outerHTML;
             } else
             element.src = urls[i];
             data.message = data.message.replace(new RegExp(urls[i] + "(?!(\"))", "g"), "<a class=\"tp-image\" href=\"" + urls[i] + "\" target=\"_blank\">" + element.outerHTML + "</a>");
             tplug.utils.scrollChat();
             }
             }
             }*/
        },
        scrollChat: function (data) {
            var $c = $("#chat-messages"),
                scrollH = $c.scrollTop() != $c[0].scrollHeight - $c.height() - 28;
            if (scrollH) $c.scrollTop($c[0].scrollHeight);
        },
        tastyMojis: function () {
            var sizeCSS = "#chat-messages span.emoji-sizer{width:22px;height:22px;vertical-align:top}";
            var _element = $("#tp-tastymojis")[0];
            if (tplug.settings.tastyMojis.enabled) {
                if (!_element) {
                    if (tplug.settings.tastyMojis.type != "ios") {
                        var img = new Image;
                        img.style.display = "none";
                        img.onload = function () {
                            $("head").append(`
                                <style id="tp-tastymojis">
                                    ` + sizeCSS + "span.emoji-inner{background:url(\"https://tastyplug.tastycat.org/images/" + tplug.settings.tastyMojis.type + ".png\")" + `
                                </style>
                            `);
                            tplug.utils.scrollChat();
                        };
                        img.src = "https://tastyplug.tastycat.org/images/" + tplug.settings.tastyMojis.type + ".png";
                        img.remove();
                    } else {
                        $("head").append(`
                                <style id="tp-tastymojis">
                                    ` + sizeCSS + `
                                </style>
                            `);
                        tplug.utils.scrollChat();
                    }
                } else {
                    if (tplug.settings.tastyMojis.type != "ios") {
                        _element.innerHTML = sizeCSS + "span.emoji-inner{background:url(\"https://tastyplug.tastycat.org/images/" + tplug.settings.tastyMojis.type + ".png\")";
                        tplug.utils.scrollChat();
                    } else if (tplug.settings.tastyMojis.type == "ios" && _element.innerHTML.trim() != sizeCSS)
                        _element.innerHTML = sizeCSS;
                }
            } else {
                $("#tp-tastymojis").remove();
            }
        },
        // Original legacy chat author: @git
        legacyChat: (function() {
            var run = false;

            // Calling it with bool parameter also sets legacy mode bool
            var toggle = function(input) {
                run = (input !== undefined) ? input : !run;

                if (run) {
                    // add the stylesheet if it's not already there
                    if ($('style.tastyplug_legacy_chat').length === 0) {
                        $('head').append(`<link class="tastyplug_legacy_chat" rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/chippers/b0322215d5b0aa83d77816107e3b9730/raw/bde18243250253774691e976f5eabf35ac4287c2/legacy_chat.css">`);
                    }
                } else {
                    $('style.tastyplug_legacy_chat').remove();
                }
                // Smooth scroll to bottom of chat div in case you're left high and dry in chat.
                //$('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
            };

            return {toggle: toggle};
        }()),
        calculateETA: function () {
            // average song duration caculated with 15k sample song data from Tastycat
            var average = 270;
            var remaining = API.getTimeRemaining();
            var position = API.getWaitListPosition();

            return (position != -1 ? tplug.utils.ETAstring(average * position++ + remaining) : "");
        },
        ETAstring: function (seconds) {
            var hours = Math.floor((seconds / 60) / 60);
            var minutes = Math.floor((seconds / 60) - (hours * 60));
            var second = Math.floor(seconds - (((hours * 60) + minutes) * 60));

            return (hours ? hours + "h" : "") + (minutes ? minutes + "m": "") + (second ? second + "s" : "0s");
        }
    },
    data: {
        save: function () {
            localStorage.tastyplug = JSON.stringify(tplug.settings);
        },
        load: function () {
            // if Tastyplug isn't saved, don't load it..
            if (!localStorage.tastyplug) return;
            try {
                var settings = JSON.parse(localStorage.tastyplug);
                // extend merges two objects together
                tplug.settings = $.extend({}, tplug.settings, settings);
            } catch (e) {}
        }
    },
    ui: {
        load: function (type) {
            // Append the CSS
            if (type && type == "css")
                return $("head").append("<link id='tp-css' type='text/css' rel='stylesheet' href='https://cdn.rawgit.com/chippers/b0322215d5b0aa83d77816107e3b9730/raw/972faede331bd9433cb49ec8ef4a7c0fb21d860c/tp.css'/>");
            $("body").append(`
                <div id="tp-room" style="position: absolute; top: 54px; left: 0"></div>
                <div id="tplug-ui">
                    <button class="tp-mainbutton"><i class="tp-logo"></i></button>
                    <div class="tp-menu" style="display: ` + (tplug.settings.visible ? "block" : "none") + `"></div>
                </div>
            `);

            $("#tplug-ui").css(tplug.settings.uiPos);

            $(".tp-mainbutton").on({
                mouseenter: function () {
                    tplug.modules.events.trigger("tooltip:show", "Single click to hide/expand, double click to swap sides.", $(this));
                },
                mouseleave: function () {
                    tplug.modules.events.trigger("tooltip:hide", "Single click to hide/expand, double click to swap sides.", $(this));
                }
            });

            var self = API.getUser();

            tplug.ui.elements.forEach(function(element, index) {
                if (!element.type) return;
                if (Math.max(self.role, self.gRole) < element.role) return;
                switch (element.type.toLowerCase()) {
                    case "primary":
                        $("#tplug-ui .tp-menu").append(`
                            <div class="button ` + element.type + `">
                                <div class="toggle ` + element.id + element.isEnabled() + `">
                                    <i class="icon icon-check-purple"></i>
                                    <span class="title">` + element.name + `
                                    </span>
                                </div>
                            </div>
                        `);
                        $("#tplug-ui .tp-menu ." + element.id).on("click", function (a) {
                            element.onClick(a, element);
                        });
                        if (element.hasOwnProperty("tooltip"))
                            $("#tplug-ui .tp-menu ." + element.id).on({
                                mouseenter: function () {
                                    tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                },
                                mouseleave: function () {
                                    tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                }
                            });
                        break;
                    case "withsettings":
                        $("#tplug-ui .tp-menu").append(`
                            <div class="button ` + element.type + `">
                                <div class="toggle ` + element.id + element.isEnabled() + `">
                                    <i class="icon icon-check-purple"></i>
                                    <span class="title">` + element.name + `
                                    </span>
                                </div>
                                <div class="settings ` + element.id + `">
                                    <i class="icon icon-settings-grey"></i>
                                </div>
                            </div>
                        `);
                        $("#tplug-ui .tp-menu .toggle." + element.id).on("click", function (a) {
                            element.onClick(a, element);
                        });
                        $(".settings." + element.id).on("click", function (a) {
                            element.onSettingsClick(a, element);
                        });
                        if (element.hasOwnProperty("tooltip"))
                            $("#tplug-ui .tp-menu ." + element.id).on({
                                mouseenter: function () {
                                    tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                },
                                mouseleave: function () {
                                    tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                }
                            });
                        break;
                    case "subtype":
                        $("#tplug-ui .tp-menu").append(`
                            <div class="button ` + element.type + `">
                                <div class="toggle ` + element.id + element.isEnabled() + `">
                                    <i class="icon icon-check-purple"></i>
                                    <span class="title">` + element.name + `
                                    </span>
                                </div>
                                <div class="expand ` + element.id + `">
                                    <i class="icon icon-drag-handle"></i>
                                </div>
                            </div>
                            <div class="submenu ` + element.id + `" style="display: none">
                            </div>
                        `);
                        $("#tplug-ui .tp-menu .toggle." + element.id).on("click", function (a) {
                            element.onClick(a, element);
                        });
                        $(".expand." + element.id).on("click", function (a) {
                            $(".submenu." + element.id).slideToggle();
                        });
                        if (element.hasOwnProperty("tooltip"))
                            $("#tplug-ui .tp-menu ." + element.id).on({
                                mouseenter: function () {
                                    tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                },
                                mouseleave: function () {
                                    tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), (tplug.settings.uiPos != "15px" ? false : true));
                                }
                            });
                        break;
                    case "secondary":
                        $("#tplug-ui .tp-menu .submenu." + element.parent).append(`
                            <div class="button ` + element.type + `">
                                <div class="toggle ` + element.id + element.isEnabled() + `">
                                    <i class="icon icon-check-white"></i>
                                    <span class="title">` + element.name + `
                                    </span>
                                </div>
                            </div>
                        `);
                        $("#tplug-ui .tp-menu ." + element.id).on("click", function (a) {
                            element.onClick(a, element);
                        });
                        break;
                    case "link":
                        $("#tplug-ui .tp-menu").append(`
                            <a href="` + element.link + `" target="_blank">
                                <div class="button ` + element.type + `">
                                    <i class="icon icon-playlist-small"></i>
                                    <span class="title">` + element.name + `
                                    </span>
                                </div>
                            </a>
                        `);
                        break;
                }
            });

            var singleClick = function (e) {
                tplug.settings.visible = !tplug.settings.visible;
                tplug.data.save();

                if (!tplug.settings.visible) {
                    $(".tp-menu").slideToggle(400, function () {
                        tplug.ui.savedMenu = $(".tp-menu").detach();
                    });
                } else {
                    $("#tplug-ui").append(tplug.ui.savedMenu);
                    $(".tp-menu").slideToggle();
                }
            };

            var doubleClick = function (e) {
                var uicont = {
                    width: $('.app-right').position().left,
                    height: $('.app-right').height()
                };

                if ((uicont.width - 230) == parseInt(tplug.settings.uiPos.left))
                    tplug.settings.uiPos.left = "15px";
                else
                    tplug.settings.uiPos.left = uicont.width - 230 + "px";

                $("#tplug-ui").css(tplug.settings.uiPos);

                tplug.modules.events.trigger("tooltip:hide");

                tplug.data.save();
            };

            $(".tp-mainbutton").click(function(e) {
                var that = this;
                setTimeout(function() {
                    var dblclick = parseInt($(that).data('double'), 10);
                    if (dblclick > 0) {
                        $(that).data('double', dblclick-1);
                    } else {
                        singleClick.call(that, e);
                    }
                }, 300);
            }).dblclick(function(e) {
                $(this).data('double', 2);
                doubleClick.call(this, e);
            });

            $(window).on("resize", tplug.ui.resize);

            if (!tplug.settings.visible)
                tplug.ui.savedMenu = $(".tp-menu").detach();

            $('#waitlist-button').append("<span class=\"tp-eta\" style=\"bottom:2px;left:45px;font-size:9px\"></span>");

            tplug.etaUpdate = setInterval(function() {
                $(".tp-eta").text(tplug.utils.calculateETA());
            }, 1e3);
        },
        unload: function (type) {
            if (type && typeof type == "string") $("#tp-css").remove();
            $("#tplug-ui").remove();
            $("#tp-room").remove();
            $("#tp-tastymojis").remove();
            $(".tp-dialog").remove();
            $("#legacy-chat-stylesheet").remove();
            clearInterval(tplug.etaUpdate);
            $(".tp-eta").remove();
            $(window).off("resize", tplug.ui.resize);
        },
        elements: [
            /*
             * id: used for class && title
             * type:
             * -primary: normal toggle
             * -secondary: toggle under subtype
             * -subtype: expanding section with more toggles
             * title: string visible on the element
             * role: if you need the specified role to see the element
             * tooltip: if has any help text, put it here
             * onClick: what it should do when clicked
             *
             */
            {
                "name":     "Auto Woot",
                "id":       "autoWoot",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.autoWoot = !tplug.settings.autoWoot;

                    var dj = API.getDJ(),
                        self = API.getUser(),
                        _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.autoWoot) {
                        if (!self.vote && dj && dj.id != self.id)
                            $("#woot").click();
                        _el.addClass("enabled");
                    } else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.autoWoot ? " enabled" : "");
                }
            },
            {
                "name":     "Auto Join",
                "id":       "autoJoin",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.autoJoin = !tplug.settings.autoJoin;

                    var _el = $("#tplug-ui .tp-menu ." + el.id);

                    if (tplug.settings.autoJoin) {
                        tplug.utils.autoJoinCheck();
                        _el.addClass("enabled");
                    } else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.autoJoin ? " enabled" : "");
                }
            },
            {
                "name":     "Hide Video",
                "id":       "hideVideo",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.hideVideo = !tplug.settings.hideVideo;

                    var _el = $("#tplug-ui ." + el.id);

                    tplug.utils.hideVideo();

                    if (tplug.settings.hideVideo) {
                        _el.addClass("enabled");
                    } else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.hideVideo ? " enabled" : "");
                }
            },
            {
                "name":     "Legacy Chat",
                "id":       "legacyChat",
                "type":     "primary",
                "role":     0,
                "tooltip":  undefined,
                onClick: function (node, el) {
                    tplug.settings.legacyChat = !tplug.settings.legacyChat;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.legacyChat)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.utils.legacyChat.toggle(tplug.settings.legacyChat);

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.legacyChat ? " enabled" : "");
                },
                tooltip: function () {
                    return "Alternate styling for the chat, without badges.";
                }
            },
            {
                "name":     "Booth Alert",
                "id":       "boothAlert",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.boothAlert = !tplug.settings.boothAlert;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.boothAlert)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.boothAlert ? " enabled" : "");
                },
                tooltip: function () {
                    return "Get notified when you're about to play!";
                }
            },
            {
                "name":     "History Alert",
                "id":       "historyAlert",
                "type":     "primary",
                "role":     2,
                onClick: function (node, el) {
                    tplug.settings.historyAlert = !tplug.settings.historyAlert;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.historyAlert)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.historyAlert ? " enabled" : "");
                },
                tooltip: function () {
                    return "Get alerted when an user plays a song that is in the history!";
                }
            },
            {
                "name":     "Meh Tracker",
                "id":       "mehTracker",
                "type":     "primary",
                "role":     2,
                onClick: function (node, el) {
                    tplug.settings.mehTracker = !tplug.settings.mehTracker;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.mehTracker)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.mehTracker ? " enabled" : "");
                }
            },
            {
                "name":     "Chat Images",
                "id":       "chatImages",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.chatImages = !tplug.settings.chatImages;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.chatImages)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.chatImages ? " enabled" : "");
                },
                tooltip: function () {
                    return "Expands image links posted in chat.";
                }
            },
            {
                "name":     "Custom Emotes",
                "id":       "customEmotes",
                "type":     "primary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.customEmotes = !tplug.settings.customEmotes;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.customEmotes)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.customEmotes ? " enabled" : "");
                },
                tooltip: function () {
                    return "Twitch Sub & Global, RCS & tastyPlug Emotes!";
                }
            },
            {
                "name":     "Chat Mentions",
                "id":       "chatMentions",
                "type":     "withSettings",
                "role":     0,
                onSettingsClick: function (node, el) {
                    var Alert = `
                        <div id="dialog-container" class="tp-dialog" style="display: block;" class="">
                            <div id="dialog-tp-mentions" class="dialog mentions">
                                <div class="dialog-frame">
                                    <span class="title">` + el.id + `</span>
                                    <i class="icon icon-dialog-close"></i>
                                </div>
                                <div class="dialog-body">
                                    <div class="left">
                                        <div class="mentions-box">
                                            <div class="container empty">
                                                <input type="text" placeholder="Type in your chat mentions here!" value="` + (tplug.settings.chatMentions.mentions.length ? tplug.settings.chatMentions.mentions.join(", ") : "") + `">
                                            <div class="helpText">Separate your chat mentions with commas.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="dialog-frame">
                                <div class="button cancel">
                                    <span>Cancel</span>
                                </div>
                                <div class="button clear">
                                    <span>Clear</span>
                                </div>
                                <div class="button save">
                                    <span>Save</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                    $("body").append(Alert);
                    $(".tp-dialog .cancel, .tp-dialog .icon-dialog-close").on("click", function (a) {
                        $(".tp-dialog").remove();
                    });
                    $(".tp-dialog .clear").on("click", function (a) {
                        $(".tp-dialog input")[0].value = "";
                    }).on({
                        mouseenter: function () {
                            tplug.modules.events.trigger("tooltip:show", "Clears the text area", $(this), (tplug.settings.uiPos != "15px" ? false : true));
                        },
                        mouseleave: function () {
                            tplug.modules.events.trigger("tooltip:hide", "Clears the text area", $(this), (tplug.settings.uiPos != "15px" ? false : true));
                        }
                    });
                    $(".tp-dialog .save").on("click", function (a) {
                        tplug.settings.chatMentions.mentions = $(".tp-dialog input")[0].value.split(",").map(function(m) {
                            return m.trim();
                        }).filter(function(m) {
                            if (!m.length) return false;
                            if (m.length == 1) return false;
                            return true;
                        });
                        tplug.ui.savedAlert = $(".tp-dialog").detach();
                    });
                },
                onClick: function (node, el) {
                    tplug.settings.chatMentions.enabled = !tplug.settings.chatMentions.enabled;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.chatMentions.enabled)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.chatMentions.enabled ? " enabled" : "");
                },
                tooltip: function () {
                    return "Set up custom words to be notified when they're sent in chat.";
                }
            },
            {
                "name":     "Join Notifications",
                "id":       "joinNotifications",
                "type":     "subtype",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.joinNotifications.enabled = !tplug.settings.joinNotifications.enabled;

                    var _el = $("#tplug-ui ." + el.id + ".toggle");

                    if (tplug.settings.joinNotifications.enabled)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.joinNotifications.enabled ? " enabled" : "");
                },
                tooltip: function () {
                    return "Be notified when certain users join the room!";
                }
            },
            {
                "name":     "Ranks",
                "id":       "ranks",
                "parent":   "joinNotifications",
                "type":     "secondary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.joinNotifications.ranks = !tplug.settings.joinNotifications.ranks;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.joinNotifications.ranks)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.joinNotifications.ranks ? " enabled" : "");
                }
            },
            {
                "name":     "Friends",
                "id":       "friends",
                "parent":   "joinNotifications",
                "type":     "secondary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.joinNotifications.friends = !tplug.settings.joinNotifications.friends;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.joinNotifications.friends)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.joinNotifications.friends ? " enabled" : "");
                }
            },
            {
                "name":     "Level 1s",
                "id":       "levelOnes",
                "parent":   "joinNotifications",
                "type":     "secondary",
                "role":     2,
                onClick: function (node, el) {
                    tplug.settings.joinNotifications.levelOnes = !tplug.settings.joinNotifications.levelOnes;

                    var _el = $("#tplug-ui ." + el.id);

                    if (tplug.settings.joinNotifications.levelOnes)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.joinNotifications.levelOnes ? " enabled" : "");
                }
            },
            {
                "name":     "tastyMojis",
                "id":       "tastyMojis",
                "type":     "subtype",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.tastyMojis.enabled = !tplug.settings.tastyMojis.enabled;

                    var _el = $("#tplug-ui .toggle." + el.id);

                    if (tplug.settings.tastyMojis.enabled)
                        _el.addClass("enabled");
                    else
                        _el.removeClass("enabled");

                    tplug.utils.tastyMojis();

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.tastyMojis.enabled ? " enabled" : "");
                },
                tooltip: function () {
                    return "Change up (and enlarge) the native emojis of plug.dj";
                }
            },
            {
                "name":     "iOS",
                "id":       "ios",
                "parent":   "tastyMojis",
                "type":     "secondary",
                "role":     0,
                "tooltip":  undefined,
                onClick: function (node, el) {
                    tplug.settings.tastyMojis.type = "ios";

                    var _el = $("#tplug-ui ." + el.id);

                    $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                    _el.addClass("enabled");

                    tplug.utils.tastyMojis();

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.tastyMojis.type == "ios" ? " enabled" : "");
                }
            },
            {
                "name":     "Twitter",
                "id":       "twitter",
                "parent":   "tastyMojis",
                "type":     "secondary",
                "role":     0,
                "tooltip":  undefined,
                onClick: function (node, el) {
                    tplug.settings.tastyMojis.type = "twitter";

                    var _el = $("#tplug-ui ." + el.id);

                    $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                    _el.addClass("enabled");

                    tplug.utils.tastyMojis();

                    tplug.data.save();
                },
                isEnabled: function () {
                    return (tplug.settings.tastyMojis.type == "twitter" ? " enabled" : "");
                }
            },
            {
                "name":     "Emojione",
                "id":       "emojione",
                "parent":   "tastyMojis",
                "type":     "secondary",
                "role":     0,
                onClick: function (node, el) {
                    tplug.settings.tastyMojis.type = "emojione";

                    var _el = $("#tplug-ui ." + el.id);

                    $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                    _el.addClass("enabled");

                    tplug.utils.tastyMojis();
                },
                isEnabled: function () {
                    return (tplug.settings.tastyMojis.type == "emojione" ? " enabled" : "");
                }
            },
            {
                "name":     "Emotes List",
                "id":       "emotesList",
                "type":     "link",
                "link":     "https://emotes.tastycat.org",
                "role":     0
            }
        ],
        resize: function () {
            var uicont = {
                width: $(".app-right").position().left,
                height: $(".app-right").height()
            };

            if (parseInt(tplug.settings.uiPos.left) != 15) tplug.settings.uiPos.left = uicont.width - 230 + "px";

            $("#tplug-ui").css(tplug.settings.uiPos);

            tplug.data.save();
        }
    },
    modules: {
        _array: [],
        require: window.require.s.contexts._.defined,
        media: null,
        events: null,
        booth: null,
        room: null,
        waitlist: null,
        lang: null,
        util: null,
        chat: null,
        init: function() {
            var that = this;

            $.each(this.require, function(name, obj){
                if (!obj) return;

                that._array.push(obj);

                that.waitlist   = (obj.isTheUserWaiting != null ? obj : that.waitlist);
                that.settings   = (obj.settings ? obj : that.settings);
                that.events     = (obj._events && obj._events["chat:receive"] ? obj : that.events);
                that.media      = (obj.attributes && obj.attributes.hasOwnProperty("media") ? obj : that.media);
                that.booth      = (obj.attributes && obj.attributes.hasOwnProperty("waitingDJs") ? obj : that.booth);
                that.room       = (obj.attributes && obj.attributes.joinTime != null ? obj : that.room);
                that.util       = (obj.isorx ? obj : that.util);
                that.chat       = (obj.chatView ? obj : that.chat);
            });

            this.lang = this.require["lang/Lang"];
        }
    },
    startup: function () {
        console.time("Tastyplug Load Time");
        // load css
        tplug.ui.load("css");
        // Load saved settings
        tplug.data.load();
        // Grab plug.dj modules
        tplug.modules.init();
        // Load events
        tplug.utils.loadEvents();
        // load the UI
        tplug.ui.load();
        // load the emotes
        tplug.utils.loadEmotes();
        // Cool msg
        tplug.utils.addChat({
            type: "startup",
            message: "v" + tplug.version + " now running!",
            special: true
        });

        if (typeof API._dispatch === "undefined") {
            API._dispatch = API.dispatch;

            API.dispatch = function(t, n) {
                API.trigger("_" + t, n);
                API._dispatch(t, n);
            };
        }
        console.timeEnd("Tastyplug Load Time");

        var dj = API.getDJ();
        var self = API.getUser();
        if (tplug.settings.autoWoot && dj && dj.id != self.id && !self.vote)
            $("#woot").click();

        if (tplug.settings.autoJoin)
            tplug.utils.autoJoinCheck();

        if (tplug.settings.hideVideo)
            tplug.utils.hideVideo();

        if (tplug.settings.tastyMojis.enabled)
            tplug.utils.tastyMojis();

        if (tplug.settings.legacyChat)
            tplug.utils.legacyChat.toggle(true);

        window.tastyPlugShutDown = window.tplug.shutdown;
    },
    shutdown: function (message) {
        // undo shit we did
        tplug.utils.legacyChat.toggle(false);
        tplug.modules.events.trigger("tooltip:hide");
        $("#playback-container").show();
        //Save settings
        tplug.data.save();
        // Unload events
        tplug.utils.unloadEvents();
        // unload the UI
        tplug.ui.unload();
        tplug.ui.unload("css");
        // save the data
        tplug.data.save();

        // remove spam
        $(".cm.tp").remove();
        var _logs = $(".log");
        for (var i = 0; i < _logs.length; i++) {
            var _e = _logs[i];
            var _text = _e.lastChild.lastChild.lastChild.textContent;
            if (_text == "tastyPlug shut down!")
                _e.remove();
        }

        // :sob:
        API.chatLog("tastyPlug shut down!");

        tplug = undefined;
        delete window.tastyPlugShutDown;
    }
};
window.tplug.startup();