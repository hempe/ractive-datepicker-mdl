module.exports = (function () {

    function _stopSmooth(selector) {
        if (_smoothActive[selector]) {
            clearInterval(_smoothActive[selector]);
            delete _smoothActive[selector];
        }
    }

    var _smoothActive = [];
    function _smooth(scrollDuration, element, target, selector) {
        element.scrollTop = target
        return;
        _stopSmooth(selector);
        var steps = 0;
        var maxSteps = (scrollDuration / 15);
        var scrollMargin = 0;
        var scrollStep = Math.PI / maxSteps;
        var cosParameter = (target - element.scrollTop) / 2;
        var pos = element.scrollTop;

        _smoothActive[selector] = setInterval(function () {
            steps++;
            if (steps >= maxSteps || Math.abs(element.scrollTop - target) < 0.5) {
                _stopSmooth(selector);
                element.scrollTop = target;
            }
            else {
                scrollMargin = cosParameter - cosParameter * Math.cos(steps * scrollStep);
                element.scrollTop = pos + scrollMargin;
            }
        }, 15);
    }

    return {
        smooth: function (scrollDuration, element, target, selector) {
            _smooth(scrollDuration, element, target, selector);
        }
    }
})();
