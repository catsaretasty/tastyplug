window.addEventListener('message', function(event) {
    // only accept messages from ourselves
    if (event.source != window) {
        return;
    }

    if (event.data.type && event.data.type == 'TASTYPLUG') {
        switch(event.data.event) {
            case 'JQUERY_LOADED':
                var jQueryUI = document.createElement('script');
                jQueryUI.id = 'tastyplug-jquery-ui-loader';
                jQueryUI.src = '<%= tastyplug_base_url %>/jquery-ui.min.js';
                jQueryUI.onload = function () {
                    this.parentNode.removeChild(this);
                };
                (document.head || document.documentElement).appendChild(jQueryUI);
                break;
            case 'CAN_LOAD':
                var tastyplug = document.createElement('script');
                tastyplug.id = 'tastyplug';
                tastyplug.src = '<%= tastyplug_base_url %>/tastyplug.core.min.js';
                tastyplug.onload = function() {
                    this.parentNode.removeChild(this);
                };
                (document.head || document.documentElement).appendChild(tastyplug);
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
bootstrap.src = '<%= tastyplug_base_url %>/bootstrap.min.js';
bootstrap.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head || document.documentElement).appendChild(bootstrap);