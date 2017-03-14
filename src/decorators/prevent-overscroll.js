
var win = window;
var doc = document;
var scroll = require('../util/scroll-helper.js');
module.exports = function (node, instance) {

    node.addEventListener('mouseenter', disableScroll);
    node.addEventListener('mouseleave', enableScroll);

    function prevent(e) {
        if (e.preventDefault)
            e.preventDefault();
        e.returnValue = false;
        return false;
    }

    function preventDefault(e) {
        e = e || win.event;
        var scrollto = node.scrollTop + e.deltaY;
        if (!node.querySelectorAll('div'))
            return;
        var all = node.querySelectorAll('div');
        var min = scroll.scrollToCenter(node, all[1]);
        if (scrollto <= min) {
            node.scrollTop = min;
            return prevent(e);
        }
        var max = scroll.scrollToCenter(node, all[all.length - 2]);
        if (scrollto >= max) {
            node.scrollTop = max;
            return prevent(e);
        }
    }

    function disableScroll() {
        win.addEventListener('DOMMouseScroll', preventDefault, false);
        win.addEventListener('wheel', preventDefault); // modern standard
        win.addEventListener('mousewheel', preventDefault); // older browsers, IE
        doc.addEventListener('mousewheel', preventDefault);
        win.addEventListener('touchmove', preventDefault); // mobile
    }

    function enableScroll() {
        win.removeEventListener('DOMMouseScroll', preventDefault, false);
        win.removeEventListener('wheel', preventDefault); // modern standard
        win.removeEventListener('mousewheel', preventDefault); // older browsers, IE
        doc.removeEventListener('mousewheel', preventDefault);
        win.removeEventListener('touchmove', preventDefault); // mobile
    }

    return {
        teardown: function () {
            console.warn("teardown....");
            enableScroll();
            node.removeEventListener('mouseenter', disableScroll);
            node.removeEventListener('mouseleave', enableScroll);
        }
    }
}