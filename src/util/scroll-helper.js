module.exports = (function () {
    function _scrollToCenter(div, child) {
        return child.offsetTop - div.offsetTop - div.offsetHeight * .5 + child.offsetHeight * .5;
    }
    return {
        scrollToCenter: function (div, child) {
            return _scrollToCenter(div, child);
        },
        divAtCenter: function (div, children) {
            for (var i = 0; i < children.length; i++) {
                if (_scrollToCenter(div, children[i]) >= div.scrollTop)
                    return children[i];
            }
            return children[children.length - 1];
        }
    }
})();
