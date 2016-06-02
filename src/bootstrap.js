(function() {
    function tastyPlugCheckJquery() {
        if(window.jQuery) {
            window.postMessage({type: "TASTYPLUG", event: "JQUERY_LOADED"}, "*");
            tastyPlugCheckForJqueryUi();
        } else {
            setTimeout(tastyPlugCheckJquery, 50);
        }
    }
    
    function tastyPlugCheckForJqueryUi() {
        if(!window.jQuery.ui) {
            window.postMessage({type: "TASTYPLUG", event: "LOAD_JQUERY_UI"}, "*");
        } 
        tastyPlugCheckCanLoad();
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
            window.postMessage({type: 'TASTYPLUG', event: "LOAD_CORE"}, "*");
        } else {
            setTimeout(tastyPlugCheckCanLoad, 50)
        }
    }
    
    tastyPlugCheckJquery();
})();