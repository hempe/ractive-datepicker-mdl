
var win = window;
var doc = document;

require('./styles.styl');

var localeStringOptions = {
    month: { month: 'long' },
    weekday: { weekday: 'short' },
    time: { hour: '2-digit', minute: '2-digit' },
};

var animate = require('./util/animate');
//var moment = require('moment');

var debounce = require('lodash/debounce');
var isNil = require('lodash/isNil');



var lastScroll = new Date()
var wheel = function () {
    lastScroll = new Date();
};
if (window.addEventListener) {
    window.addEventListener('DOMMouseScroll', wheel, false);
}
window.onmousewheel = document.onmousewheel = wheel;

module.exports = Ractive.extend({

    template: require('template.html'),

    isolated: true,

    decorators: {
        //preventOverscroll: require('./decorators/prevent-overscroll.js'),
        tooltip: require('ractive-tooltip'),
    },

    events: {
        hover: require('ractive-events-hover')
    },

    data: function () {
        var _this = {

            // the selected date
            date: new Date(),

            // start/end dates if in range mode
            range: null, // 'day', 'week', 'month', 'year'
            start: null,
            end: null,

            // "date" or "datetime". Useful if you don't want to select a specific hour/minute.
            mode: 'datetime',
            'weekday-format': 'ddd',
            'min-year': 1990,
            'max-year': 2030,
            // currently viewed year/month
            current: {
                year: 0,
                month: 0,
            },

            editing: 'date',
            years: [],
            hours: Array.apply(0, Array(23 * 3)).map(function (a, i) { return (i % 24) }),
            minutes: Array.apply(0, Array(59 * 3)).map(function (a, i) { return (i % 60) < 10 ? '0' + (i % 60) : i % 60 }),

            lastSet: 'end',

            /**
            * Increment minutes by this interval when setting time.
            * @default 1
            * @type integer
            */
            minuteIncrement: 1,

            moment: moment,

            // helpers

            year: function (d) {
                return d.getFullYear();
            },

            month: function (d) {
                return moment(d).format('MMMM');
            },

            hour: function (d) {
                return d.getHours();
            },

            minute: function (d) {
                return d.getMinutes();
            },

            time: function (d) {
                return moment(d).format('LT')
            },

            weekdayShort: function (d) {
                return moment(d).format('ddd');
            },
            weekday: function (d) {
                return moment(d).format(_this['weekday-format']);
            }
        }
        return _this;
    },

    computed: {

        // date computations

        currentMonth: function () {
            var current = this.get('current');
            if (current)
                return moment(new Date(current.year, current.month)).format('MMMM');
        },

        currentYear: function () {
            return this.get('current.year');
        },

        daysOfWeek: function () {

            var dow = moment.localeData()._weekdaysMin;
            var fdow = this.get('firstDayOfWeek')

            var firstDayOfWeek = isNil(fdow) ? moment.localeData().firstDayOfWeek() : fdow;

            if (firstDayOfWeek > 0 && firstDayOfWeek < 7) {
                return Array.prototype.concat(dow.slice(firstDayOfWeek), dow.slice(0, firstDayOfWeek));
            }

            return dow;
        },

        dates: function () {

            var current = this.get('current');
            var totalDays = new Date(current.year, current.month, 0).getDate(); // of month
            var firstDayOfMonth = new Date(current.year, current.month, 1).getDay(); // day of week the 1st is on
            var firstDayOfWeek = this.get('firstDayOfWeek'); // default 0, Sunday, configurable

            var days = [];

            if (firstDayOfWeek > 0 && firstDayOfWeek < 7) {
                firstDayOfMonth = firstDayOfMonth - firstDayOfWeek;
                firstDayOfMonth = firstDayOfMonth < 0 ? 7 + firstDayOfMonth : firstDayOfMonth;
            }

            for (var i = 0, j = 1 - firstDayOfMonth; i < 42; i++ , j++)
                //days.push((i >= firstDayOfMonth & i < firstDayOfMonth + totalDays ? new Date(current.year, current.month, j) : ' '));
                days.push(new Date(current.year, current.month, j));

            return days;

        }
    },

    onconfig: function () {

        var self = this;

        var date = self.get('date');
        var range = self.get('range');

        var start = self.get('start');
        var end = self.get('end');

        if (!date) {
            date = new Date();
            if (!range)
                self.set('date', date);
        }

        function isAfter(start, end) {
            return start.getTime() < end.getTime();
        }

        if (range) {
            if (!start) {
                start = date;
                self.set('start', start);
            }
            if (end === undefined || (end && !moment(start).isAfter(end))) {
                end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000); // default to 3 days after
                self.set('end', end);
            }
        }

        // update current
        self.set('current.month', date.getMonth());
        self.set('current.year', date.getFullYear());

        var minYear = self.get('min-year');
        var maxYear = self.get('max-year');
        var diff = maxYear - minYear;
        var years = Array.apply(0, Array((diff + 1) * 3)).map(function (a, i) { return (minYear + i % diff) });
        self.set('years', years);
    },

    oninit: function () {
        window.onresize = function (event) {
            console.warn("resize...");
            setPosition('.hours');
            setPosition('.minutes');
            setPosition('.years');
        }

        var self = this;

        self.on('decrementMonth', function (details) {
            var current = this.get('current');
            current.month--;
            if (current.month < 0) {
                current.month = 11;
                current.year--;
            }
            this.set('current', current);
        });

        self.on('incrementMonth', function (details) {
            var current = this.get('current');
            current.month++;
            if (current.month > 11) {
                current.month = 0;
                current.year++;
            }
            this.set('current', current);
        });

        self.on('setDate', function (details) {

            var clicked = details.get();

            var current = self.get('current');
            var date = self.get('date');
            var range = self.get('range');
            var start = self.get('start');
            var end = self.get('end');

            var lastSet = self.get('lastSet');

            // store these so we can restore them later
            var hours = date.getHours();
            var minutes = date.getMinutes();

            if (range) {

                date = clicked;

                date.setHours(hours);
                date.setMinutes(minutes);


                if (lastSet == 'end' || moment(clicked).isBefore(start)) {

                    self.set('start', date);

                    self.fire('startChange');

                    self.set('current.year', clicked.getFullYear());
                    self.set('current.month', clicked.getMonth());

                    self.set('end', null);
                    self.set('lastSet', 'start');

                } else {

                    self.set('lastSet', 'end');
                    self.set('end', date);
                    self.fire('endChange');
                    self.set('ghostEnd', null);

                }


            } else {

                date = clicked;

                date.setHours(hours);
                date.setMinutes(minutes);

                self.set('current.year', clicked.getFullYear());
                self.set('current.month', clicked.getMonth());

                self.set('date', date);

            }

        });

        self.on('setYear', function (details) {
            var date = self.get('date');
            if (details.context)
                date.setFullYear(details.context);
            self.set('date', date);
            self.set('current.year', details.context);
            setPosition('.years');
        });

        self.on('fixYear', function (details) {
            self.fire('setYear', details);
            self.set('editing', 'date');
        });

        self.on('setHours', function (details) {
            details.context = details.context % 24;
            var date = self.get('date');
            date.setHours(details.context);
            self.set('date', date);
            self.set('editing', 'time');
            setPosition('.hours');
        });

        self.on('setMinutes', function (details) {
            details.context = details.context % 60;
            var date = self.get('date');
            date.setMinutes(details.context);
            self.set('date', date);
            self.set('editing', 'time');
            setPosition('.minutes');
        });

        self.observe('editing', function (editing) {
            setTimeout(function () {
                console.warn("editing:", editing);
                if (editing.indexOf('year') > -1) {
                    setPosition('.years');
                }
                if (editing.indexOf('time') > -1) {
                    setPosition('.hours');
                    setPosition('.minutes');
                }
            });
        }, { init: false, defer: true });

        self.observe('mode', function (newMode) {

            var editing = self.get('editing');

            if (newMode == 'date' && editing == 'time')
                editing = 'date';

            if (newMode == 'time' && (editing == 'date' || editing == 'year'))
                editing = 'time';

            self.set('editing', editing);

        }, { defer: true });

        self.observe('start end', function () {
            self.set('ghostEnd', null);
        });

        function setPosition(selector) {
            var element = self.find(selector);
            if (!element)
                return;
            var actives = self.findAll(selector + ' .active');
            if (!actives)
                return
            var active = actives[1];
            if (!active)
                return;

            fixOverscroll(selector);
            var styles = window.getComputedStyle(self.find('.editor'));
            var offset = parseInt(styles.paddingTop, 10);
            var target = active.offsetTop - element.offsetHeight / 2 + active.clientHeight / 2 - offset;
            var len = actives[1].offsetTop - actives[0].offsetTop;
            target = (target % len) + len;
            smooth(100, element, target);
        }

        function smooth(scrollDuration, element, target) {
            var steps = 0;
            var maxSteps = (scrollDuration / 15);
            var scrollMargin = 0;
            var scrollStep = Math.PI / maxSteps;
            var cosParameter = (target - element.scrollTop) / 2;
            var pos = element.scrollTop;

            var scrollInterval = setInterval(function () {
                steps++;
                if (steps >= maxSteps || Math.abs(element.scrollTop - target) < 0.5) {
                    clearInterval(scrollInterval);
                    element.scrollTop = target;
                    return;
                }
                else {
                    scrollMargin = cosParameter - cosParameter * Math.cos(steps * scrollStep);
                    element.scrollTop = pos + scrollMargin;
                }
            }, 15);
        }

        function snap(node, method, value) {
            if (!node)
                return;

            var div = node.querySelector('div');
            if (!div)
                return;

            var divHeight = div.offsetHeight + parseFloat(window.getComputedStyle(div).marginBottom);
            var index = Math.round(node.scrollTop / divHeight + node.offsetHeight / divHeight / 2 - .5);
            self.fire(method, { context: Number(node.children[index].textContent) });
        }

        var debouncedSnap = debounce(snap, 250);

        function fixOverscroll(selector) {
            var element = self.find(selector);
            var actives = self.findAll(selector + ' .active');
            var len = actives[1].offsetTop - actives[0].offsetTop;
            if (element.scrollTop >= (len) * 2) {
                element.scrollTop -= len;
            }
            else if (element.scrollTop <= len) {
                element.scrollTop += len;
            }
        }

        self.on('wheel', function (details, method) {
            var event = details.original;
            if (method == 'setYear') fixOverscroll('.years');
            if (method == 'setHours') fixOverscroll('.hours');
            if (method == 'setMinutes') fixOverscroll('.minutes');
            debouncedSnap(details.node, method);
        });
    },

    // prevent computation errors for weird
    date: function () {
        var d = this.get('date');
        if (d instanceof Date)
            return d;
    }

});

