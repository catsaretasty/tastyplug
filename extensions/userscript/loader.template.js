var tastyplug = document.createElement('script');
tastyplug.id = 'tastyplug-bootstrap';
tastyplug.src = '<%= tastyplug_base_url %>/tastyplug.min.js';
tastyplug.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head || document.documentElement).appendChild(tastyplug);