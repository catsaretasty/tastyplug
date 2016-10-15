var bootstrap = document.createElement('script');
bootstrap.id = 'tastyplug-extension';
bootstrap.src = chrome.extension.getURL('tastyplug.js');
bootstrap.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head || document.documentElement).appendChild(bootstrap);