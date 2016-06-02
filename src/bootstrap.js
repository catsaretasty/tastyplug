(function() {
    function tastyPlugCheckJquery() {
        if(window.jQuery) {
            window.postMessage({type: "TASTYPLUG", event: "JQUERY_LOADED"}, "*");
            tastyPlugCheckCanLoad();
        } else {
            setTimeout(tastyPlugCheckJquery, 50);
        }
    }

    function canLoad() {
        return window.require &&
            window.API &&
            window.jQuery &&
            window.jQuery.ui &&
            window.jQuery('#room').length > 0;
    }
    
    function tastyPlugCheckCanLoad() {
        if(canLoad()) {
            window.postMessage({type: 'TASTYPLUG', event: "CAN_LOAD"}, "*");
        } else {
            setTimeout(tastyPlugCheckCanLoad, 50)
        }
    }
    
    tastyPlugCheckJquery();
})();