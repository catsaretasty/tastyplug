(function() {
    /**
     * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
     * Released under MIT license, http://github.com/requirejs/almond/LICENSE
     */
    //Going sloppy to avoid 'use strict' string cost, but strict practices should
    //be followed.
    /*global setTimeout: false */

    var requirejs, require, define;
    (function(undef) {
        var main, req, makeMap, handlers,
            defined = {},
            waiting = {},
            config = {},
            defining = {},
            hasOwn = Object.prototype.hasOwnProperty,
            aps = [].slice,
            jsSuffixRegExp = /\.js$/;

        function hasProp(obj, prop) {
            return hasOwn.call(obj, prop);
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @returns {String} normalized name
         */
        function normalize(name, baseName) {
            var nameParts, nameSegment, mapValue, foundMap, lastIndex,
                foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
                baseParts = baseName && baseName.split("/"),
                map = config.map,
                starMap = (map && map['*']) || {};

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                //start trimDots
                for (i = 0; i < name.length; i++) {
                    part = name[i];
                    if (part === '.') {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === '..') {
                        // If at the start, or previous value is still ..,
                        // keep them so that when converted to a path it may
                        // still work when converted to a path, even though
                        // as an ID it is less than ideal. In larger point
                        // releases, may be better to just kick out an error.
                        if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                            continue;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join('/');
            }

            //Apply map config if available.
            if ((baseParts || starMap) && map) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join("/");

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = map[baseParts.slice(0, j).join('/')];

                            //baseName segment has  config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = mapValue[nameSegment];
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && starMap[nameSegment]) {
                        foundStarMap = starMap[nameSegment];
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function makeRequire(relName, forceSync) {
            return function() {
                //A version of a require function that passes a moduleName
                //value for items that may need to
                //look up paths relative to the moduleName
                var args = aps.call(arguments, 0);

                //If first arg is not require('string'), and there is only
                //one arg, it is the array form without a callback. Insert
                //a null so that the following concat is correct.
                if (typeof args[0] !== 'string' && args.length === 1) {
                    args.push(null);
                }
                return req.apply(undef, args.concat([relName, forceSync]));
            };
        }

        function makeNormalize(relName) {
            return function(name) {
                return normalize(name, relName);
            };
        }

        function makeLoad(depName) {
            return function(value) {
                defined[depName] = value;
            };
        }

        function callDep(name) {
            if (hasProp(waiting, name)) {
                var args = waiting[name];
                delete waiting[name];
                defining[name] = true;
                main.apply(undef, args);
            }

            if (!hasProp(defined, name) && !hasProp(defining, name)) {
                throw new Error('No ' + name);
            }
            return defined[name];
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        //Creates a parts array for a relName where first part is plugin ID,
        //second part is resource ID. Assumes relName has already been normalized.
        function makeRelParts(relName) {
            return relName ? splitPrefix(relName) : [];
        }

        /**
         * Makes a name map, normalizing the name, and using a plugin
         * for normalization if necessary. Grabs a ref to plugin
         * too, as an optimization.
         */
        makeMap = function(name, relParts) {
            var plugin,
                parts = splitPrefix(name),
                prefix = parts[0],
                relResourceName = relParts[1];

            name = parts[1];

            if (prefix) {
                prefix = normalize(prefix, relResourceName);
                plugin = callDep(prefix);
            }

            //Normalize according
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relResourceName));
                } else {
                    name = normalize(name, relResourceName);
                }
            } else {
                name = normalize(name, relResourceName);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];
                if (prefix) {
                    plugin = callDep(prefix);
                }
            }

            //Using ridiculous property names for space reasons
            return {
                f: prefix ? prefix + '!' + name : name, //fullName
                n: name,
                pr: prefix,
                p: plugin
            };
        };

        function makeConfig(name) {
            return function() {
                return (config && config.config && config.config[name]) || {};
            };
        }

        handlers = {
            require: function(name) {
                return makeRequire(name);
            },
            exports: function(name) {
                var e = defined[name];
                if (typeof e !== 'undefined') {
                    return e;
                } else {
                    return (defined[name] = {});
                }
            },
            module: function(name) {
                return {
                    id: name,
                    uri: '',
                    exports: defined[name],
                    config: makeConfig(name)
                };
            }
        };

        main = function(name, deps, callback, relName) {
            var cjsModule, depName, ret, map, i, relParts,
                args = [],
                callbackType = typeof callback,
                usingExports;

            //Use name if no relName
            relName = relName || name;
            relParts = makeRelParts(relName);

            //Call the callback to define the module, if necessary.
            if (callbackType === 'undefined' || callbackType === 'function') {
                //Pull out the defined dependencies and pass the ordered
                //values to the callback.
                //Default to [require, exports, module] if no deps
                deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
                for (i = 0; i < deps.length; i += 1) {
                    map = makeMap(deps[i], relParts);
                    depName = map.f;

                    //Fast path CommonJS standard dependencies.
                    if (depName === "require") {
                        args[i] = handlers.require(name);
                    } else if (depName === "exports") {
                        //CommonJS module spec 1.1
                        args[i] = handlers.exports(name);
                        usingExports = true;
                    } else if (depName === "module") {
                        //CommonJS module spec 1.1
                        cjsModule = args[i] = handlers.module(name);
                    } else if (hasProp(defined, depName) ||
                        hasProp(waiting, depName) ||
                        hasProp(defining, depName)) {
                        args[i] = callDep(depName);
                    } else if (map.p) {
                        map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                        args[i] = defined[depName];
                    } else {
                        throw new Error(name + ' missing ' + depName);
                    }
                }

                ret = callback ? callback.apply(defined[name], args) : undefined;

                if (name) {
                    //If setting exports via "module" is in play,
                    //favor that over return value and exports. After that,
                    //favor a non-undefined return value over exports use.
                    if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                        defined[name] = cjsModule.exports;
                    } else if (ret !== undef || !usingExports) {
                        //Use the return value from the function.
                        defined[name] = ret;
                    }
                }
            } else if (name) {
                //May just be an object definition for the module. Only
                //worry about defining if have a module name.
                defined[name] = callback;
            }
        };

        requirejs = require = req = function(deps, callback, relName, forceSync, alt) {
            if (typeof deps === "string") {
                if (handlers[deps]) {
                    //callback in this case is really relName
                    return handlers[deps](callback);
                }
                //Just return the module wanted. In this scenario, the
                //deps arg is the module name, and second arg (if passed)
                //is just the relName.
                //Normalize module name, if it contains . or ..
                return callDep(makeMap(deps, makeRelParts(callback)).f);
            } else if (!deps.splice) {
                //deps is a config object, not an array.
                config = deps;
                if (config.deps) {
                    req(config.deps, config.callback);
                }
                if (!callback) {
                    return;
                }

                if (callback.splice) {
                    //callback is an array, which means it is a dependency list.
                    //Adjust args if there are dependencies
                    deps = callback;
                    callback = relName;
                    relName = null;
                } else {
                    deps = undef;
                }
            }

            //Support require(['a'])
            callback = callback || function() {};

            //If relName is a function, it is an errback handler,
            //so remove it.
            if (typeof relName === 'function') {
                relName = forceSync;
                forceSync = alt;
            }

            //Simulate async callback;
            if (forceSync) {
                main(undef, deps, callback, relName);
            } else {
                //Using a non-zero value because of concern for what old browsers
                //do, and latest browsers "upgrade" to 4 if lower value is used:
                //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
                //If want a value immediately, use require('id') instead -- something
                //that works in almond on the global level, but not guaranteed and
                //unlikely to work in other AMD implementations.
                setTimeout(function() {
                    main(undef, deps, callback, relName);
                }, 4);
            }

            return req;
        };

        /**
         * Just drops the config on the floor, but returns req in case
         * the config return value is used.
         */
        req.config = function(cfg) {
            return req(cfg);
        };

        /**
         * Expose module registry for debugging and tooling
         */
        requirejs._defined = defined;

        define = function(name, deps, callback) {
            if (typeof name !== 'string') {
                throw new Error('See almond README: incorrect module build, no module name');
            }

            //This module may not have dependencies
            if (!deps.splice) {
                //deps is not an array, so probably means
                //an object literal or factory function for
                //the value. Adjust args.
                callback = deps;
                deps = [];
            }

            if (!hasProp(defined, name) && !hasProp(waiting, name)) {
                waiting[name] = [name, deps, callback];
            }
        };

        define.amd = {
            jQuery: true
        };
    }());

    define("../node_modules/almond/almond", function() {});

    define("tastyplug", [], function() {
        "use strict";

        function _defineProperty(obj, key, value) {
            if (key in obj) {
                Object.defineProperty(obj, key, {
                    value: value,
                    enumerable: true,
                    configurable: true,
                    writable: true
                });
            } else {
                obj[key] = value;
            }

            return obj;
        }

        var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
            return typeof obj;
        } : function(obj) {
            return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        };

        // if its already running, shut down, then run.
        if (typeof window.tastyPlugShutDown != "undefined" || typeof window.tplug != "undefined") window.tastyPlugShutDown();
        window.tplug = {
            version: "<%= version %>",
            baseURL: "<%= tastyplug_base_url %>",
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
            session: {
                votes: {}
            },
            events: {
                plug: {
                    _advance: function _advance(data) {
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

                        if (tplug.settings.historyAlert && Math.max(self.gRole, self.role) > 1 && history.indexOf(data.media.cid) != -1) tplug.utils.addChat({
                            type: "warning",
                            message: "is playing a song from the History!<br />It was played " + (history.indexOf(data.media.cid) + 1) + " songs ago.",
                            icon: "chat-system",
                            user: API.getHistory()[history.indexOf(data.media.cid)].user
                        });
                    },
                    chatCommand: function chatCommand(data) {
                        var command = {
                            name: data.split(" ")[0].substr(1).toLowerCase(),
                            args: data.split(" ").splice(1)
                        };

                        if (command.name.charAt(0) == "/") command.name = command.name.substr(1);

                        var user = API.getUser(),
                            keys = Object.keys(tplug.commands);

                        for (var i = 0; i < keys.length; i++) {
                            if (tplug.commands[keys[i]].names.indexOf(command.name) != -1) {
                                if (Math.max(user.role, user.gRole) >= tplug.commands[keys[i]].role) return tplug.commands[keys[i]].run(data, command, user);
                            }
                        }
                    },
                    userJoin: function userJoin(user) {
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
                            if (Math.max(user.gRole, user.role) > 0 && tplug.settings.joinNotifications.ranks) tplug.utils.addChat({
                                type: "join-" + (user.gRole == 5 ? "admin" : user.gRole == 3 ? "ambassador" : "staff"),
                                message: (user.gRole > 0 ? gRoles[user.gRole] : roles[user.role]) + ", has joined the room!",
                                icon: "chat-" + (user.gRole == 5 ? "admin" : user.gRole == 3 ? "ambassador" : user.role > 3 ? "host" : user.role == 3 ? "manager" : user.role == 2 ? "bouncer" : "dj"),
                                user: user
                            });
                            else if (user.friend && tplug.settings.joinNotifications.friends) tplug.utils.addChat({
                                type: "friend",
                                message: "your friend, has joined the room!",
                                icon: "community-users",
                                user: user
                            });
                            else if (user.level == 1 && tplug.settings.joinNotifications.levelOnes && Math.max(self.gRole, self.role) > 1) tplug.utils.addChat({
                                type: "levelOne",
                                message: "a level 1 user, has joined the room!",
                                icon: "community-users",
                                user: user
                            });
                        }
                    },
                    _voteUpdate: function _voteUpdate(voteUpdate) {
                        if (voteUpdate.vote != -1) return;
                        var self = API.getUser();
                        // no role? meh track not enabled? fk off
                        if (!tplug.settings.mehTracker || Math.max(self.role, self.gRole) < 2) return;
                        // if they haven't voted, make a 0 counter for them
                        if (!tplug.session.votes[voteUpdate.user.id]) tplug.session.votes[voteUpdate.user.id] = 0;
                        // and add 1 to it
                        tplug.session.votes[voteUpdate.user.id]++;

                        var _element = $(".tp.tp-meh.id-" + voteUpdate.user.id + ".history-" + tplug.modules.media.get("historyID")).last();

                        if (_element.length) _element.find(".text").text("has meh'd the song! (" + tplug.session.votes[voteUpdate.user.id] + "x)");
                        else tplug.utils.addChat({
                            type: "meh id-" + voteUpdate.user.id + " history-" + tplug.modules.media.get("historyID"),
                            message: "has meh'd the song!",
                            icon: "meh",
                            user: voteUpdate.user
                        });
                    },
                    waitListUpdate: function waitListUpdate(waitlist) {
                        var self = API.getUser();
                        // waitlist array of ids
                        var wl = waitlist.map(function(u) {
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
                    preChat: function preChat(data) {
                        if (data.type.indexOf("log") != -1 || data.type.indexOf("welcome") != -1 || data.type.indexOf("system") != -1 || data.type.indexOf("moderation") != -1 || data.type.indexOf("rsshit") != -1) return;
                        var waitlist = tplug.modules.waitlist,
                            self = API.getUser(),
                            user = API.getUser(data.uid);
                        // message without html tags
                        data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

                        // first step for fixing the /me|/em mention bug
                        if (data.type.indexOf("emote") != -1 /*rcs*/ || data.type.indexOf("undefined") != -1 /*rcs*/ ) {
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

                        if (tplug.settings.chatMentions.enabled && tplug.settings.chatMentions.mentions.length) tplug.utils.customMentions(data);

                        if (tplug.settings.customEmotes) tplug.utils.customEmotes(data);

                        //if (tplug.settings.chatImages) tplug.utils.chatImages(data);
                    },
                    postChat: function postChat(data) {
                        if (data.type.indexOf("log") != -1 || data.type.indexOf("welcome") != -1 || data.type.indexOf("system") != -1 || data.type.indexOf("moderation") != -1 || data.type.indexOf("rsshit") != -1) return;
                        var self = API.getUser(),
                            user = API.getUser(data.uid),
                            mentions = [];
                        // message without html tags
                        data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

                        if (tplug.settings.chatMentions.enabled && tplug.settings.chatMentions.mentions.length) {
                            for (var i = 0; i < tplug.settings.chatMentions.mentions.length; i++) {
                                if (data.msg.match(new RegExp("\\b(" + tplug.settings.chatMentions.mentions[i].trim() + ")\\b", "gi")) && mentions.indexOf(tplug.settings.chatMentions.mentions[i].trim()) == -1) mentions.push(tplug.settings.chatMentions.mentions[i].trim());
                            }
                        }

                        // final step for fixing the /em|/me mention bug
                        if (data.type.indexOf("emote") != -1 && (Math.max(user.gRole, user.role) >= 3 && data.uid != self.id && data.msg.match(/@(everyone|djs|staff|rdjs|bouncers|managers|hosts)(\,|\.|\!|\?|\ |$)/gi) != null || data.msg.indexOf("@" + self.username) != -1) || mentions.length && data.msg.match(new RegExp("\\b(" + mentions.join("|") + ")\\b", "gi"))) {
                            if ($("[data-cid^='" + data.cid + "']").length) {
                                $("[data-cid^='" + data.cid + "']").addClass("mention");
                                $("[data-cid^='" + data.cid + "']").addClass(self.gRole == 5 ? "is-admin" : self.gRole == 3 ? "is-ambassador" : self.role ? "is-staff" : self.sub ? "is-subscriber" : self.silver ? "is-subscriber silver" : "is-you");
                            } else {
                                $(".cid-" + data.cid).parent().parent().addClass("mention");
                                $(".cid-" + data.cid).parent().parent().addClass(self.gRole == 5 ? "is-admin" : self.gRole == 3 ? "is-ambassador" : self.role ? "is-staff" : self.sub ? "is-subscriber" : self.silver ? "is-subscriber silver" : "is-you");
                            }
                        }

                        var $c = $("#chat-messages"),
                            scrollH = $c.scrollTop() > $c[0].scrollHeight - $c.height() - 28;
                        if (scrollH) $c.scrollTop($c[0].scrollHeight);
                    },
                    roomJoined: function roomJoined() {
                        tplug.ui.unload();
                        tplug.ui.load();
                    }
                }
            },
            commands: {
                lock: {
                    names: ["lock", "unlock"],
                    role: 3,
                    run: function run(data, command, user) {
                        if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                        if (tplug.modules.booth.toJSON().isLocked && command.name == "lock") return tplug.utils.addChat({
                            type: "error",
                            message: "The WaitList is already locked!",
                            icon: "chat-system"
                        });
                        else if (!tplug.modules.booth.toJSON().isLocked && command.name == "unlock") return tplug.utils.addChat({
                            type: "error",
                            message: "The WaitList is already unlocked!",
                            icon: "chat-system"
                        });
                        else return tplug.utils.ajax({
                            type: "PUT",
                            url: "/_/booth/lock",
                            data: {
                                "isLocked": command.name == "lock" ? true : false,
                                "removeAllDJs": false
                            }
                        });
                    }
                },
                cycle: {
                    names: ["cycle"],
                    role: 3,
                    run: function run(data, command, user) {
                        if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                        var boolean = tplug.modules.booth.toJSON().shouldCycle;
                        return tplug.utils.ajax({
                            type: "PUT",
                            url: "/_/booth/cycle",
                            data: {
                                "shouldCycle": !boolean
                            }
                        });
                    }
                },
                ban: {
                    names: ["ban"],
                    role: 3,
                    run: function run(data, command, user) {
                        if (typeof window.rcs != "undefined" && window.rcs.settings.slashCommands) return;
                        var target = tplug.utils.getUser(command.args.join(" "));
                        if (typeof target == "undefined" && isNaN(parseInt(command.args[0]))) return tplug.utils.addChat({
                            type: "error",
                            message: "User not found.",
                            icon: "chat-system"
                        });
                        else if (!isNaN(parseInt(command.args[0]))) return tplug.utils.ajax({
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
                    run: function run(data, command, user) {
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
                        var dur = durObj[command.args[command.args.length - 1]] ? durObj[command.args.pop()] : "h";
                        var target = tplug.utils.getUser(command.args.join(" "));
                        if (typeof target == "undefined" && isNaN(parseInt(command.args[0]))) return tplug.utils.addChat({
                            type: "error",
                            message: "User not found.",
                            icon: "chat-system"
                        });
                        else if (!isNaN(parseInt(command.args[0]))) return tplug.utils.ajax({
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
                    run: function run(data, command, user) {
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
                        var dur = durObj[command.args[command.args.length - 1]] ? durObj[command.args.pop()] : "s";
                        var target = tplug.utils.getUser(command.args.join(" "));
                        if (!target) return tplug.utils.addChat({
                            type: "error",
                            message: "User not found.",
                            icon: "chat-system"
                        });
                        // only managers in tastycat
                        if ((location.pathname == "/tastycat" && user.role >= 3 || (location.pathname != "/tastycat" && Math.max(user.role, user.gRole)) >= 3) && 3 > Math.max(target.role, target.gRole) && Math.max(target.role, target.gRole) > 0) {
                            tplug.utils.ajax({
                                type: "DELETE",
                                url: "/_/staff/" + target.id
                            }, function() {
                                tplug.utils.ajax({
                                    type: "POST",
                                    url: "/_/mutes",
                                    data: {
                                        "userID": target.id,
                                        "reason": 1,
                                        "duration": dur
                                    }
                                }, function() {
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
                    run: function run(data, command, user) {
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
                    run: function run(data, command, user) {
                        var target = tplug.utils.getUser(command.args.length ? command.args.join(" ") : undefined);
                        if (!target) return tplug.utils.addChat({
                            type: "error",
                            message: "User not found.",
                            icon: "chat-system"
                        });
                        tplug.utils.ajax({
                            url: "/_/users/" + target.id
                        }, function(err, data) {
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
                    run: function run(data, command, user) {
                        var media = API.getMedia();
                        if (!media) return;
                        if (media.format == 1) tplug.utils.addChat({
                            type: "info-small",
                            message: "<a target=\"_blank\" href=\"https://youtu.be/" + media.cid + "\">" + media.author + " - " + media.title + "</a>",
                            icon: "chat-system"
                        });
                        else tplug.utils.fetchJSON("https://api.soundcloud.com/tracks/" + media.cid + "?client_id=bd7fb07288b526f6f190bfd02b31b25e", function(err, data) {
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
                    run: function run(data, command, user) {
                        var media = API.getMedia();
                        if (!media) return;
                        if (media.format == 1) {
                            var img = new Image();
                            img.onload = function() {
                                tplug.utils.scrollChat();
                            };
                            tplug.utils.addChat({
                                type: "info-small",
                                message: "Thumbnail: <br /><a target=\"_blank\" href=\"https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg\"><img src=\"https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg\" style=\"max-width: 200px\"></a>",
                                icon: "chat-system"
                            });
                            img.src = "https://i1.ytimg.com/vi/" + media.cid + "/maxresdefault.jpg";
                        } else tplug.utils.fetchJSON("https://api.soundcloud.com/tracks/" + media.cid + "?client_id=bd7fb07288b526f6f190bfd02b31b25e", function(err, data) {
                            if (err) return;
                            var img = new Image();
                            img.onload = function() {
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
                    run: function run(data, command, user) {
                        tplug.shutdown();
                    }
                }
            },
            utils: {
                getUser: function getUser(info) {
                    if (typeof info == "undefined" || info == null) return API.getUser();
                    info = info.charAt(0) == "@" ? info.substr(1) : info;
                    var users = API.getUsers().filter(function(user) {
                        if (user.username == info) return user;
                        if (user.username == info.trim()) return user;
                        if (user.username.toLowerCase() == info.toLowerCase()) return user;
                        if (user.username.toLowerCase() == info.toLowerCase().trim()) return user;
                        if (user.id == parseInt(info)) return user;
                    });

                    return users[0];
                },
                ajax: function ajax(obj, callback) {
                    if (!obj || (typeof obj === "undefined" ? "undefined" : _typeof(obj)) != "object" || !obj.url) return;
                    var req = $.ajax({
                        type: obj.type || "GET",
                        url: obj.url,
                        contentType: obj.data ? "application/json" : undefined,
                        data: obj.data ? JSON.stringify(obj.data) : undefined
                    });

                    if (callback && typeof callback == "function") {
                        req.done(function(data) {
                            callback(null, data);
                        });
                        req.fail(function(jqXHR, textStatus) {
                            callback({
                                jqXHR: jqXHR,
                                textStatus: textStatus
                            });
                        });
                    }
                },
                addChat: function addChat(data) {
                    var timestamp = tplug.modules.util.getChatTimestamp(false);

                    var chat = {
                        type: "tp tp-" + (data.type ? data.type : "log"),
                        message: data.message || "Missing string",
                        uid: data.user && data.user.id ? data.user.id : 10000000,
                        un: data.user && data.user.username ? data.user.username : "tastyPlug",
                        timestamp: timestamp,
                        cid: "tp-" + (data.user && data.user.id ? data.user.id : 10000000) + "-" + Math.floor(Math.random() * 1337000123456789),
                        sound: data.sound ? data.sound : undefined
                    };
                    tplug.modules.chat.chatView.onReceived(chat);

                    $("[data-cid=" + chat.cid + "] .delete-button").off().remove();
                    $("[data-cid=" + chat.cid + "] .badge-box").children().remove();
                    $("[data-cid=" + chat.cid + "] .badge-box").removeClass("no-badge");
                    if (data.special) $("[data-cid=" + chat.cid + "] .badge-box").append("<i class='tp-icon-" + (data.icon || "default") + "'></i>");
                    else $("[data-cid=" + chat.cid + "] .badge-box").append("<i class='icon icon-" + (data.icon || "drag-media") + "'></i>");
                    $("#chat-messages").scrollTop($("#chat-messages").prop("scrollHeight"));
                },
                loadEmotes: function loadEmotes() {
                    var regex = /{image_id}/,
                        links = {
                            tp: "https://emotes.tastycat.org/emotes.json",
                            rcs: "https://code.radiant.dj/require/emotes/radiant_emotes.json",
                            twitch: "https://twitchemotes.com/api_cache/v2/global.json",
                            twitchSub: "https://twitchemotes.com/api_cache/v2/subscriber.json"
                        };

                    if (!tplug.emotes || _typeof(tplug.emotes) != "object") tplug.emotes = {};

                    tplug.utils.fetchJSON(links.twitchSub, function(err, data) {
                        if (err) tplug.utils.addChat({
                            type: "error",
                            message: "Twitch Sub Emotes could not be loaded.",
                            icon: "chat-system"
                        });
                        else {
                            for (var channel in data.channels) {
                                if (data.channels.hasOwnProperty(channel)) {
                                    var e = data.channels[channel].emotes;
                                    for (var i = 0; i < e.length; i++) {
                                        tplug.emotes[e[i].code.toLowerCase()] = data.template.small.replace(regex, e[i].image_id);
                                    }
                                }
                            }
                        }
                        tplug.utils.fetchJSON(links.twitch, function(err, data) {
                            if (err) tplug.utils.addChat({
                                type: "error",
                                message: "Twitch Global Emotes could not be loaded.",
                                icon: "chat-system"
                            });
                            else
                                for (var i in data.emotes) {
                                    tplug.emotes[i.toLowerCase()] = data.template.small.replace(regex, data.emotes[i].image_id);
                                }
                            tplug.utils.fetchJSON(links.rcs, function(err, data) {
                                if (err) tplug.utils.addChat({
                                    type: "error",
                                    message: "RCS Emotes could not be loaded.",
                                    icon: "chat-system"
                                });
                                else
                                    for (var i in data.emotes) {
                                        for (var j in data.emotes[i]) {
                                            tplug.emotes[j.toLowerCase()] = "https://cdn.radiant.dj/rcs/emotes/img/" + data.emotes[i][j];
                                        }
                                    }
                                tplug.utils.fetchJSON(links.tp, function(err, data) {
                                    if (err) tplug.utils.addChat({
                                        type: "error",
                                        message: "tastyPlug Emotes could not be loaded.",
                                        icon: "chat-system"
                                    });
                                    else
                                        for (var i in data.emotes) {
                                            tplug.emotes[i.toLowerCase()] = data.emotes[i];
                                        }
                                });
                            });
                        });
                    });
                },
                fetchJSON: function fetchJSON(url, callback) {
                    if (!callback || typeof callback != "function") return;

                    $.ajax({
                        type: "GET",
                        url: url
                    }).success(function(data) {
                        callback(null, data);
                    }).fail(function(data) {
                        callback("no json for you");
                    });
                },
                replace: function replace(string, obj) {
                    if ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) != "object") return string;

                    var objectKeys = Object.keys(obj);

                    objectKeys.forEach(function(key) {
                        string = string.split("%%" + key.toUpperCase() + "%%").join(obj[key]);
                    });

                    return string;
                },
                loadEvents: function loadEvents() {
                    API.on(tplug.events.plug);

                    if (tplug.modules.events != null) {
                        tplug.modules.events.on("chat:receive", tplug.events.modules.preChat);
                        tplug.modules.events._events["chat:receive"].unshift(tplug.modules.events._events["chat:receive"].pop());
                        tplug.modules.events.on("chat:receive", tplug.events.modules.postChat);
                        tplug.modules.events.on("room:joined", tplug.events.modules.roomJoined);
                    }
                },
                unloadEvents: function unloadEvents() {
                    API.off(tplug.events.plug);

                    if (tplug.modules.events != null) {
                        tplug.modules.events.off("chat:receive", tplug.events.modules.preChat);
                        tplug.modules.events.off("chat:receive", tplug.events.modules.postChat);
                        tplug.modules.events.off("room:joined", tplug.events.modules.roomJoined);
                    }
                },
                autoJoinCheck: function autoJoinCheck() {
                    var booth = tplug.modules.booth.attributes,
                        waitlist = tplug.modules.waitlist;

                    if (!waitlist.isTheUserPlaying && !waitlist.isTheUserWaiting && !booth.isLocked && waitlist.length < 50) {
                        API.djJoin();
                        return true;
                    }
                    return false;
                },
                customMentions: function customMentions(data) {
                    var mentions = [];

                    for (var i = 0; i < tplug.settings.chatMentions.mentions.length; i++) {
                        if (data.msg.match(new RegExp("\\B(" + tplug.settings.chatMentions.mentions[i].trim() + ")\\b", "gi")) && mentions.indexOf(tplug.settings.chatMentions.mentions[i].trim()) == -1) mentions.push(tplug.settings.chatMentions.mentions[i].trim());
                    }
                    if (!mentions.length) return;

                    data.sound = "mention";

                    for (var i = 0; i < mentions.length; i++) {
                        data.message = data.message.replace(new RegExp(mentions[i], "gi"), "<span class=\"name\">" + mentions[i] + "</span>");
                    }
                },
                customEmotes: function customEmotes(data) {
                    if (!Object.keys(tplug.emotes).length) return;

                    var emotes = data.msg.match(/:[^:\s]+:/g),
                        keys = Object.keys(tplug.emotes);

                    if (!emotes) return;
                    emotes = emotes.filter(function(e) {
                        if (keys.indexOf(e.substring(1, e.length - 1).toLowerCase()) != -1) return true;
                        return false;
                    });
                    if (!emotes.length) return;
                    var emote = emotes.shift();

                    if (keys.indexOf(emote.substring(1, emote.length - 1).toLowerCase()) == -1) emote = emotes.shift();
                    else {
                        var image = new Image();
                        image.style.display = "inline-block";
                        image.style.verticalAlign = "top";
                        image.className = "tp-emote";
                        image.title = emote;
                        image.onload = function() {
                            tplug.utils.scrollChat();
                        };
                        image.src = tplug.emotes[keys[keys.indexOf(emote.substring(1, emote.length - 1).toLowerCase())]];
                        data.message = data.message.replace(new RegExp(emote, "gi"), image.outerHTML.replace(":", "&#58;"));
                    }
                    data.msg = data.message.replace(/<(.|\n)*?>/gi, "");

                    this.customEmotes(data);
                },
                hideVideo: function hideVideo() {
                    if (tplug.settings.hideVideo) $("#playback-container").hide();
                    else $("#playback-container").show();
                },
                chatImages: function chatImages(data) {
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
                scrollChat: function scrollChat(data) {
                    var $c = $("#chat-messages"),
                        scrollH = $c.scrollTop() != $c[0].scrollHeight - $c.height() - 28;
                    if (scrollH) $c.scrollTop($c[0].scrollHeight);
                },
                tastyMojis: function tastyMojis() {
                    var sizeCSS = "#chat-messages span.emoji-sizer{width:22px;height:22px;vertical-align:top}";
                    var _element = $("#tp-tastymojis")[0];
                    if (tplug.settings.tastyMojis.enabled) {
                        if (!_element) {
                            if (tplug.settings.tastyMojis.type != "ios") {
                                var img = new Image();
                                img.style.display = "none";
                                img.onload = function() {
                                    $("head").append("\n                                <style id=\"tp-tastymojis\">\n                                    " + sizeCSS + "span.emoji-inner{background:url(\"https://catsaretasty.github.io/tastyplug/images/" + tplug.settings.tastyMojis.type + ".png\")" + "\n                                </style>\n                            ");
                                    tplug.utils.scrollChat();
                                };
                                img.src = "https://catsaretasty.github.io/tastyplug/images/" + tplug.settings.tastyMojis.type + ".png";
                                img.remove();
                            } else {
                                $("head").append("\n                                <style id=\"tp-tastymojis\">\n                                    " + sizeCSS + "\n                                </style>\n                            ");
                                tplug.utils.scrollChat();
                            }
                        } else {
                            if (tplug.settings.tastyMojis.type != "ios") {
                                _element.innerHTML = sizeCSS + "span.emoji-inner{background:url(\"https://catsaretasty.github.io/tastyplug/images/" + tplug.settings.tastyMojis.type + ".png\")";
                                tplug.utils.scrollChat();
                            } else if (tplug.settings.tastyMojis.type == "ios" && _element.innerHTML.trim() != sizeCSS) _element.innerHTML = sizeCSS;
                        }
                    } else {
                        $("#tp-tastymojis").remove();
                    }
                },
                // Original legacy chat author: @git
                legacyChat: function() {
                    var run = false;

                    // Calling it with bool parameter also sets legacy mode bool
                    var toggle = function toggle(input) {
                        run = input !== undefined ? input : !run;

                        if (run) {
                            // add the stylesheet if it's not already there
                            if ($('.tastyplug_legacy_chat').length === 0) {
                                $('head').append("<link class=\"tastyplug_legacy_chat\" rel=\"stylesheet\" type=\"text/css\" href=\"" + tplug.baseURL + "/styles/legacy_chat.min.css\">");
                            }
                        } else {
                            $('.tastyplug_legacy_chat').remove();
                        }
                        // Smooth scroll to bottom of chat div in case you're left high and dry in chat.
                        //$('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
                    };

                    return {
                        toggle: toggle
                    };
                }(),
                calculateETA: function calculateETA() {
                    // average song duration caculated with 15k sample song data from Tastycat
                    var average = 270;
                    var remaining = API.getTimeRemaining();
                    var position = API.getWaitListPosition();

                    return position != -1 ? tplug.utils.ETAstring(average * position++ + remaining) : "";
                },
                ETAstring: function ETAstring(seconds) {
                    var hours = Math.floor(seconds / 60 / 60);
                    var minutes = Math.floor(seconds / 60 - hours * 60);
                    var second = Math.floor(seconds - (hours * 60 + minutes) * 60);

                    return (hours ? hours + "h" : "") + (minutes ? minutes + "m" : "") + (second ? second + "s" : "0s");
                }
            },
            data: {
                save: function save() {
                    localStorage.tastyplug = JSON.stringify(tplug.settings);
                },
                load: function load() {
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
                load: function load(type) {
                    // Append the CSS
                    if (type && type == "css") return $("head").append("<link id='tp-css' type='text/css' rel='stylesheet' href='${tplug.baseURL}/styles/tastyplug.min.css'/>");
                    $("body").append("\n                <div id=\"tp-room\" style=\"position: absolute; top: 54px; left: 0\"></div>\n                <div id=\"tplug-ui\">\n                    <button class=\"tp-mainbutton\"><i class=\"tp-logo\"></i></button>\n                    <div class=\"tp-menu\" style=\"display: " + (tplug.settings.visible ? "block" : "none") + "\"></div>\n                </div>\n            ");

                    $("#tplug-ui").css(tplug.settings.uiPos);

                    $(".tp-mainbutton").on({
                        mouseenter: function mouseenter() {
                            tplug.modules.events.trigger("tooltip:show", "Single click to hide/expand, double click to swap sides.", $(this));
                        },
                        mouseleave: function mouseleave() {
                            tplug.modules.events.trigger("tooltip:hide", "Single click to hide/expand, double click to swap sides.", $(this));
                        }
                    });

                    var self = API.getUser();

                    tplug.ui.elements.forEach(function(element, index) {
                        if (!element.type) return;
                        if (Math.max(self.role, self.gRole) < element.role) return;
                        switch (element.type.toLowerCase()) {
                            case "primary":
                                $("#tplug-ui .tp-menu").append("\n                            <div class=\"button " + element.type + "\">\n                                <div class=\"toggle " + element.id + element.isEnabled() + "\">\n                                    <i class=\"icon icon-check-purple\"></i>\n                                    <span class=\"title\">" + element.name + "\n                                    </span>\n                                </div>\n                            </div>\n                        ");
                                $("#tplug-ui .tp-menu ." + element.id).on("click", function(a) {
                                    element.onClick(a, element);
                                });
                                if (element.hasOwnProperty("tooltip")) $("#tplug-ui .tp-menu ." + element.id).on({
                                    mouseenter: function mouseenter() {
                                        tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    },
                                    mouseleave: function mouseleave() {
                                        tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    }
                                });
                                break;
                            case "withsettings":
                                $("#tplug-ui .tp-menu").append("\n                            <div class=\"button " + element.type + "\">\n                                <div class=\"toggle " + element.id + element.isEnabled() + "\">\n                                    <i class=\"icon icon-check-purple\"></i>\n                                    <span class=\"title\">" + element.name + "\n                                    </span>\n                                </div>\n                                <div class=\"settings " + element.id + "\">\n                                    <i class=\"icon icon-settings-grey\"></i>\n                                </div>\n                            </div>\n                        ");
                                $("#tplug-ui .tp-menu .toggle." + element.id).on("click", function(a) {
                                    element.onClick(a, element);
                                });
                                $(".settings." + element.id).on("click", function(a) {
                                    element.onSettingsClick(a, element);
                                });
                                if (element.hasOwnProperty("tooltip")) $("#tplug-ui .tp-menu ." + element.id).on({
                                    mouseenter: function mouseenter() {
                                        tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    },
                                    mouseleave: function mouseleave() {
                                        tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    }
                                });
                                break;
                            case "subtype":
                                $("#tplug-ui .tp-menu").append("\n                            <div class=\"button " + element.type + "\">\n                                <div class=\"toggle " + element.id + element.isEnabled() + "\">\n                                    <i class=\"icon icon-check-purple\"></i>\n                                    <span class=\"title\">" + element.name + "\n                                    </span>\n                                </div>\n                                <div class=\"expand " + element.id + "\">\n                                    <i class=\"icon icon-drag-handle\"></i>\n                                </div>\n                            </div>\n                            <div class=\"submenu " + element.id + "\" style=\"display: none\">\n                            </div>\n                        ");
                                $("#tplug-ui .tp-menu .toggle." + element.id).on("click", function(a) {
                                    element.onClick(a, element);
                                });
                                $(".expand." + element.id).on("click", function(a) {
                                    $(".submenu." + element.id).slideToggle();
                                });
                                if (element.hasOwnProperty("tooltip")) $("#tplug-ui .tp-menu ." + element.id).on({
                                    mouseenter: function mouseenter() {
                                        tplug.modules.events.trigger("tooltip:show", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    },
                                    mouseleave: function mouseleave() {
                                        tplug.modules.events.trigger("tooltip:hide", element.tooltip(), $(this), tplug.settings.uiPos != "15px" ? false : true);
                                    }
                                });
                                break;
                            case "secondary":
                                $("#tplug-ui .tp-menu .submenu." + element.parent).append("\n                            <div class=\"button " + element.type + "\">\n                                <div class=\"toggle " + element.id + element.isEnabled() + "\">\n                                    <i class=\"icon icon-check-white\"></i>\n                                    <span class=\"title\">" + element.name + "\n                                    </span>\n                                </div>\n                            </div>\n                        ");
                                $("#tplug-ui .tp-menu ." + element.id).on("click", function(a) {
                                    element.onClick(a, element);
                                });
                                break;
                            case "link":
                                $("#tplug-ui .tp-menu").append("\n                            <a href=\"" + element.link + "\" target=\"_blank\">\n                                <div class=\"button " + element.type + "\">\n                                    <i class=\"icon icon-playlist-small\"></i>\n                                    <span class=\"title\">" + element.name + "\n                                    </span>\n                                </div>\n                            </a>\n                        ");
                                break;
                        }
                    });

                    var singleClick = function singleClick(e) {
                        tplug.settings.visible = !tplug.settings.visible;
                        tplug.data.save();

                        if (!tplug.settings.visible) {
                            $(".tp-menu").slideToggle(400, function() {
                                tplug.ui.savedMenu = $(".tp-menu").detach();
                            });
                        } else {
                            $("#tplug-ui").append(tplug.ui.savedMenu);
                            $(".tp-menu").slideToggle();
                        }
                    };

                    var doubleClick = function doubleClick(e) {
                        var uicont = {
                            width: $('.app-right').position().left,
                            height: $('.app-right').height()
                        };

                        if (uicont.width - 230 == parseInt(tplug.settings.uiPos.left)) tplug.settings.uiPos.left = "15px";
                        else tplug.settings.uiPos.left = uicont.width - 230 + "px";

                        $("#tplug-ui").css(tplug.settings.uiPos);

                        tplug.modules.events.trigger("tooltip:hide");

                        tplug.data.save();
                    };

                    $(".tp-mainbutton").click(function(e) {
                        var that = this;
                        setTimeout(function() {
                            var dblclick = parseInt($(that).data('double'), 10);
                            if (dblclick > 0) {
                                $(that).data('double', dblclick - 1);
                            } else {
                                singleClick.call(that, e);
                            }
                        }, 300);
                    }).dblclick(function(e) {
                        $(this).data('double', 2);
                        doubleClick.call(this, e);
                    });

                    $(window).on("resize", tplug.ui.resize);

                    if (!tplug.settings.visible) tplug.ui.savedMenu = $(".tp-menu").detach();

                    $('#waitlist-button').append("<span class=\"tp-eta\" style=\"bottom:2px;left:45px;font-size:9px\"></span>");

                    tplug.etaUpdate = setInterval(function() {
                        $(".tp-eta").text(tplug.utils.calculateETA());
                    }, 1e3);
                },
                unload: function unload(type) {
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
                        "name": "Auto Woot",
                        "id": "autoWoot",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.autoWoot = !tplug.settings.autoWoot;

                            var dj = API.getDJ(),
                                self = API.getUser(),
                                _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.autoWoot) {
                                if (!self.vote && dj && dj.id != self.id) $("#woot").click();
                                _el.addClass("enabled");
                            } else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.autoWoot ? " enabled" : "";
                        }
                    }, {
                        "name": "Auto Join",
                        "id": "autoJoin",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.autoJoin = !tplug.settings.autoJoin;

                            var _el = $("#tplug-ui .tp-menu ." + el.id);

                            if (tplug.settings.autoJoin) {
                                tplug.utils.autoJoinCheck();
                                _el.addClass("enabled");
                            } else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.autoJoin ? " enabled" : "";
                        }
                    }, {
                        "name": "Hide Video",
                        "id": "hideVideo",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.hideVideo = !tplug.settings.hideVideo;

                            var _el = $("#tplug-ui ." + el.id);

                            tplug.utils.hideVideo();

                            if (tplug.settings.hideVideo) {
                                _el.addClass("enabled");
                            } else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.hideVideo ? " enabled" : "";
                        }
                    },
                    _defineProperty({
                        "name": "Legacy Chat",
                        "id": "legacyChat",
                        "type": "primary",
                        "role": 0,
                        "tooltip": undefined,
                        onClick: function onClick(node, el) {
                            tplug.settings.legacyChat = !tplug.settings.legacyChat;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.legacyChat) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.utils.legacyChat.toggle(tplug.settings.legacyChat);

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.legacyChat ? " enabled" : "";
                        }
                    }, "tooltip", function tooltip() {
                        return "Alternate styling for the chat, without badges.";
                    }), {
                        "name": "Booth Alert",
                        "id": "boothAlert",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.boothAlert = !tplug.settings.boothAlert;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.boothAlert) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.boothAlert ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Get notified when you're about to play!";
                        }
                    }, {
                        "name": "History Alert",
                        "id": "historyAlert",
                        "type": "primary",
                        "role": 2,
                        onClick: function onClick(node, el) {
                            tplug.settings.historyAlert = !tplug.settings.historyAlert;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.historyAlert) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.historyAlert ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Get alerted when an user plays a song that is in the history!";
                        }
                    }, {
                        "name": "Meh Tracker",
                        "id": "mehTracker",
                        "type": "primary",
                        "role": 2,
                        onClick: function onClick(node, el) {
                            tplug.settings.mehTracker = !tplug.settings.mehTracker;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.mehTracker) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.mehTracker ? " enabled" : "";
                        }
                    }, {
                        "name": "Chat Images",
                        "id": "chatImages",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.chatImages = !tplug.settings.chatImages;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.chatImages) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.chatImages ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Expands image links posted in chat.";
                        }
                    }, {
                        "name": "Custom Emotes",
                        "id": "customEmotes",
                        "type": "primary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.customEmotes = !tplug.settings.customEmotes;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.customEmotes) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.customEmotes ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Twitch Sub & Global, RCS & tastyPlug Emotes!";
                        }
                    }, {
                        "name": "Chat Mentions",
                        "id": "chatMentions",
                        "type": "withSettings",
                        "role": 0,
                        onSettingsClick: function onSettingsClick(node, el) {
                            var Alert = "\n                        <div id=\"dialog-container\" class=\"tp-dialog\" style=\"display: block;\" class=\"\">\n                            <div id=\"dialog-tp-mentions\" class=\"dialog mentions\">\n                                <div class=\"dialog-frame\">\n                                    <span class=\"title\">" + el.id + "</span>\n                                    <i class=\"icon icon-dialog-close\"></i>\n                                </div>\n                                <div class=\"dialog-body\">\n                                    <div class=\"left\">\n                                        <div class=\"mentions-box\">\n                                            <div class=\"container empty\">\n                                                <input type=\"text\" placeholder=\"Type in your chat mentions here!\" value=\"" + (tplug.settings.chatMentions.mentions.length ? tplug.settings.chatMentions.mentions.join(", ") : "") + "\">\n                                            <div class=\"helpText\">Separate your chat mentions with commas.</div>\n                                        </div>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"dialog-frame\">\n                                <div class=\"button cancel\">\n                                    <span>Cancel</span>\n                                </div>\n                                <div class=\"button clear\">\n                                    <span>Clear</span>\n                                </div>\n                                <div class=\"button save\">\n                                    <span>Save</span>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                    ";
                            $("body").append(Alert);
                            $(".tp-dialog .cancel, .tp-dialog .icon-dialog-close").on("click", function(a) {
                                $(".tp-dialog").remove();
                            });
                            $(".tp-dialog .clear").on("click", function(a) {
                                $(".tp-dialog input")[0].value = "";
                            }).on({
                                mouseenter: function mouseenter() {
                                    tplug.modules.events.trigger("tooltip:show", "Clears the text area", $(this), tplug.settings.uiPos != "15px" ? false : true);
                                },
                                mouseleave: function mouseleave() {
                                    tplug.modules.events.trigger("tooltip:hide", "Clears the text area", $(this), tplug.settings.uiPos != "15px" ? false : true);
                                }
                            });
                            $(".tp-dialog .save").on("click", function(a) {
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
                        onClick: function onClick(node, el) {
                            tplug.settings.chatMentions.enabled = !tplug.settings.chatMentions.enabled;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.chatMentions.enabled) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.chatMentions.enabled ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Set up custom words to be notified when they're sent in chat.";
                        }
                    }, {
                        "name": "Join Notifications",
                        "id": "joinNotifications",
                        "type": "subtype",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.joinNotifications.enabled = !tplug.settings.joinNotifications.enabled;

                            var _el = $("#tplug-ui ." + el.id + ".toggle");

                            if (tplug.settings.joinNotifications.enabled) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.joinNotifications.enabled ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Be notified when certain users join the room!";
                        }
                    }, {
                        "name": "Ranks",
                        "id": "ranks",
                        "parent": "joinNotifications",
                        "type": "secondary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.joinNotifications.ranks = !tplug.settings.joinNotifications.ranks;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.joinNotifications.ranks) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.joinNotifications.ranks ? " enabled" : "";
                        }
                    }, {
                        "name": "Friends",
                        "id": "friends",
                        "parent": "joinNotifications",
                        "type": "secondary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.joinNotifications.friends = !tplug.settings.joinNotifications.friends;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.joinNotifications.friends) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.joinNotifications.friends ? " enabled" : "";
                        }
                    }, {
                        "name": "Level 1s",
                        "id": "levelOnes",
                        "parent": "joinNotifications",
                        "type": "secondary",
                        "role": 2,
                        onClick: function onClick(node, el) {
                            tplug.settings.joinNotifications.levelOnes = !tplug.settings.joinNotifications.levelOnes;

                            var _el = $("#tplug-ui ." + el.id);

                            if (tplug.settings.joinNotifications.levelOnes) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.joinNotifications.levelOnes ? " enabled" : "";
                        }
                    }, {
                        "name": "tastyMojis",
                        "id": "tastyMojis",
                        "type": "subtype",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.tastyMojis.enabled = !tplug.settings.tastyMojis.enabled;

                            var _el = $("#tplug-ui .toggle." + el.id);

                            if (tplug.settings.tastyMojis.enabled) _el.addClass("enabled");
                            else _el.removeClass("enabled");

                            tplug.utils.tastyMojis();

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.tastyMojis.enabled ? " enabled" : "";
                        },
                        tooltip: function tooltip() {
                            return "Change up (and enlarge) the native emojis of plug.dj";
                        }
                    }, {
                        "name": "iOS",
                        "id": "ios",
                        "parent": "tastyMojis",
                        "type": "secondary",
                        "role": 0,
                        "tooltip": undefined,
                        onClick: function onClick(node, el) {
                            tplug.settings.tastyMojis.type = "ios";

                            var _el = $("#tplug-ui ." + el.id);

                            $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                            _el.addClass("enabled");

                            tplug.utils.tastyMojis();

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.tastyMojis.type == "ios" ? " enabled" : "";
                        }
                    }, {
                        "name": "Twitter",
                        "id": "twitter",
                        "parent": "tastyMojis",
                        "type": "secondary",
                        "role": 0,
                        "tooltip": undefined,
                        onClick: function onClick(node, el) {
                            tplug.settings.tastyMojis.type = "twitter";

                            var _el = $("#tplug-ui ." + el.id);

                            $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                            _el.addClass("enabled");

                            tplug.utils.tastyMojis();

                            tplug.data.save();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.tastyMojis.type == "twitter" ? " enabled" : "";
                        }
                    }, {
                        "name": "Emojione",
                        "id": "emojione",
                        "parent": "tastyMojis",
                        "type": "secondary",
                        "role": 0,
                        onClick: function onClick(node, el) {
                            tplug.settings.tastyMojis.type = "emojione";

                            var _el = $("#tplug-ui ." + el.id);

                            $(".submenu." + el.parent).find(".enabled").removeClass("enabled");

                            _el.addClass("enabled");

                            tplug.utils.tastyMojis();
                        },
                        isEnabled: function isEnabled() {
                            return tplug.settings.tastyMojis.type == "emojione" ? " enabled" : "";
                        }
                    }, {
                        "name": "Emotes List",
                        "id": "emotesList",
                        "type": "link",
                        "link": "https://emotes.tastycat.org",
                        "role": 0
                    }
                ],
                resize: function resize() {
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
                init: function init() {
                    var that = this;

                    $.each(this.require, function(name, obj) {
                        if (!obj) return;

                        that._array.push(obj);

                        that.waitlist = obj.isTheUserWaiting != null ? obj : that.waitlist;
                        that.settings = obj.settings ? obj : that.settings;
                        that.events = obj._events && obj._events["chat:receive"] ? obj : that.events;
                        that.media = obj.attributes && obj.attributes.hasOwnProperty("media") ? obj : that.media;
                        that.booth = obj.attributes && obj.attributes.hasOwnProperty("waitingDJs") ? obj : that.booth;
                        that.room = obj.attributes && obj.attributes.joinTime != null ? obj : that.room;
                        that.util = obj.isorx ? obj : that.util;
                        that.chat = obj.chatView ? obj : that.chat;
                    });

                    this.lang = this.require["lang/Lang"];
                }
            },
            startup: function startup() {
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
                    message: "v" + tplug.version + " <%= version_title =>",
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
                if (tplug.settings.autoWoot && dj && dj.id != self.id && !self.vote) $("#woot").click();

                if (tplug.settings.autoJoin) tplug.utils.autoJoinCheck();

                if (tplug.settings.hideVideo) tplug.utils.hideVideo();

                if (tplug.settings.tastyMojis.enabled) tplug.utils.tastyMojis();

                if (tplug.settings.legacyChat) tplug.utils.legacyChat.toggle(true);

                window.tastyPlugShutDown = window.tplug.shutdown;
            },
            shutdown: function shutdown(message) {
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
                    if (_text == "tastyPlug shut down!") _e.remove();
                }

                // :sob:
                API.chatLog("tastyPlug shut down!");

                tplug = undefined;
                delete window.tastyPlugShutDown;
            }
        };
        window.tplug.startup();
    });

    require(["tastyplug"]);
}());