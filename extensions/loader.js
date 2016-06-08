var loaded = false;

window.addEventListener('message', function(event) {
    // only accept messages from ourselves
    if (event.source != window) {
        return;
    }

    if (event.data.type && event.data.type == 'TASTYPLUG') {
        switch(event.data.event) {
            case 'LOAD_JQUERY_UI':
                var jQueryUI = document.createElement('script');
                jQueryUI.id = 'tastyplug-jquery-ui-custom-loader';
                jQueryUI.src = chrome.extension.getURL('jquery-ui.custom.js');
                jQueryUI.onload = function () {
                    this.parentNode.removeChild(this);
                };
                (document.head || document.documentElement).appendChild(jQueryUI);
                break;
            case 'LOAD_CORE':
                if (!loaded) {
                    var tastyplug = document.createElement('script');
                    tastyplug.id = 'tastyplug';
                    tastyplug.src = chrome.extension.getURL('tastyplug.core.js');
                    tastyplug.onload = function () {
                        this.parentNode.removeChild(this);
                    };
                    (document.head || document.documentElement).appendChild(tastyplug);
                    loaded = true;
                }
                break;
            case 'RELOAD':
                console.log('TastyPlug is suppose to reload here lol');
                break;
            default:
                break;
        }
    }
});

var bootstrap = document.createElement('script');
bootstrap.id = 'tastyplug-bootstrap';
bootstrap.src = chrome.extension.getURL('bootstrap.js');
bootstrap.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head || document.documentElement).appendChild(bootstrap);