
var win = window;
var doc = document;

require('./styles.styl');

//var animate = require('./util/animate');
//var moment = require('moment');

var debounce = require('lodash/debounce');
var isNil = require('lodash/isNil');
var scroll = require('./util/scroll-helper');
var animate = require('./util/animate');
var dateHelper = require('./util/date-helper');

module.exports = Ractive.extend({

    template: require('template.html'),

    isolated: true,

    decorators: {
        preventOverscroll: require('./decorators/prevent-overscroll.js'),
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
            'min-year': 2015,
            'max-year': 2020,
            // currently viewed year/month
            current: {
                year: 0,
                month: 0,
            },

            editing: 'time',
            years: [],
            hours: [],
            minutes: [],
            //minutes: Array.apply(0, Array(59 * 3)).map(function (a, i) { return (i % 60) < 10 ? '0' + (i % 60) : i % 60 }),

            lastSet: 'end',

            /**
            * Increment minutes by this interval when setting time.
            * @default 1
            * @type integer
            */
            'minutes-increment': 15,

            /**
             * The time format 12 or 24
             * @default 24
             * @type integer
             */
            'hour-format': 24,
            moment: moment,

            // helpers

            year: function (d) {
                return d.getFullYear();
            },

            month: function (d) {
                return moment(d).format('MMMM');
            },

            hour: function (d) {
                var hourFormat = _this['hour-format'];
                if (hourFormat == 12)
                    return moment(d).format("hh");
                return moment(d).format("H");
            },
            meridiem: function (d) {
                if (d.getHours)
                    d = d.getHours();
                console.info("called")
                return d < 12 ? 'am' : 'pm';
            },
            minute: function (d) {
                return d.getMinutes();
            },

            time: function (d) {
                var hourFormat = _this['hour-format'];
                if (hourFormat == 12)
                    return moment(d).format('hh:mm A');
                return moment(d).format("HH:mm");
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

        var hourFormat = self.get('hour-format');
        var hours = [];
        if (hourFormat == 12) {
            console.info("hour format 12");
            hours = Array.apply(0, Array(11 * 3)).map(function (a, i) { return (i % 12) + 1 });
        } else {
            console.info("hour format 24");
            hours = Array.apply(0, Array(23 * 3)).map(function (a, i) { return (i % 24) });
        }
        self.set('hours', hours);

        var minuteIncrement = self.get('minutes-increment');
        var minutes = Array.apply(0, Array(Math.ceil(59 * 3 / minuteIncrement)))
            .map(function (a, i) { return (i * minuteIncrement % 60) < 10 ? '0' + (i * minuteIncrement % 60) : i * minuteIncrement % 60 });
        self.set('minutes', minutes);

        var date = self.get('date');
        var range = self.get('range');

        if (!date) {
            date = new Date();
            if (!range)
                self.set('date', date);
        }


        function isAfter(start, end) {
            return start.getTime() < end.getTime();
        }

        var start = self.get('start');
        var end = self.get('end');
        if (range) {
            if (!start) {
                start = date;
                self.set('start', start);
            }
            if (!end || (end && !moment(start).isAfter(end))) {
                end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000); // default to 3 days after
                self.set('end', end);
            }
        }

        if (date) {
            date = dateHelper.setMinutes(date, self.get('minutes-increment'));
            self.set('data', date);
        }
        if (start) {
            start = dateHelper.setMinutes(start, self.get('minutes-increment'));
            self.set('start', start);
        }
        if (end) {
            end = dateHelper.setMinutes(end, self.get('minutes-increment'));
            self.set('end', end);
        }

        // update current
        self.set('current.month', date.getMonth());
        self.set('current.year', date.getFullYear());
        self.set('editing', '');
        setTimeout(function () {
            self.set('editing', 'date');
        }, 100);
    },

    oninit: function () {
        window.onresize = function (event) {
            console.warn("resize...");
            setPosition('.hours', 1);
            setPosition('.minutes', 1);
            setPosition('.years', 0);
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

                date = dateHelper.setHours(date, self.get('hour-format'), hours);
                date = dateHelper.setMinutes(date, self.get('minutes-increment'), minutes);

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

                date = dateHelper.setHours(date, self.get('hour-format'), hours);
                date = dateHelper.setMinutes(date, self.get('minutes-increment'), minutes);

                self.set('current.year', clicked.getFullYear());
                self.set('current.month', clicked.getMonth());

                self.set('date', date);

            }

        });

        self.on('setYear', function (details) {
            console.info("set year", details.context);
            var date = self.get('date');
            if (Number(details.context) < 0) {
                return;
            }
            else if (details.context) {
                date.setFullYear(details.context);
            }
            self.set('date', date);
            self.set('current.year', details.context);
            setPosition('.years', 0);
        });

        self.on('fixYear', function (details) {
            if (Number(details.context) < 0) {
                return;
            }
            self.fire('setYear', details);
            self.set('editing', 'date');
        });

        self.on('setHours', function (details) {
            var date = dateHelper.setHours(self.get('date'), self.get('hour-format'), details.context);
            self.set('date', date);
            setPosition('.hours', 1);
        });

        self.on('setMinutes', function (details) {
            var date = dateHelper.setMinutes(self.get('date'), self.get('minutes-increment'), details.context);
            self.set('date', date);
            setPosition('.minutes', 1);
        });

        self.on('setMeridiem', function (details, meridiem) {
            console.warn("set meridiem", details, meridiem);

            var date = self.get('date');
            console.info("before %o", date.getHours());
            var hours = date.getHours();
            if (hours <= 12 && meridiem == 'pm')
                date.setHours(hours + 12);
            else if (hours >= 12 && meridiem == 'am')
                date.setHours(hours - 12);

            console.info("after %o", date.getHours());
            self.set('date', date);
        });

        self.observe('min-year', function (minYear) {
            console.debug("min-year changed %o", minYear);
            setYears(minYear, self.get('max-year'));
        }, { init: true, defer: true });

        self.observe('max-year', function (maxYear) {
            console.debug("max-year changed %o", maxYear);
            setYears(self.get('min-year'), maxYear);
        }, { init: true, defer: true });

        self.observe('editing', function (editing) {
            setTimeout(function () {
                console.warn("editing:", editing);
                if (editing.indexOf('year') > -1) {
                    setPosition('.years', 0);
                }
                if (editing.indexOf('time') > -1) {
                    setPosition('.hours', 1);
                    setPosition('.minutes', 1);
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

        function setYears(minYear, maxYear) {
            var diff = maxYear - minYear;
            var years = Array.apply(0, Array(diff + 1)).map(function (a, i) { return minYear + i });
            self.set('years', years);
        }

        function setPosition(selector, index, hard) {
            var element = self.find(selector);
            if (!element)
                return;
            var actives = self.findAll(selector + ' .active');
            if (!actives)
                return
            var active = actives[index];
            if (!active)
                return;

            animate.smooth(100, element, scroll.scrollToCenter(element, active), selector);
        }

        function snap(node, method) {
            if (!node)
                return;
            var to = scroll.divAtCenter(node, node.querySelectorAll('div'));
            self.fire(method, { context: Number(to.textContent) });
        }

        var debouncedSnap = debounce(snap, 250);

        function fixOverscroll(selector) {
            var element = self.find(selector);
            var actives = self.findAll(selector + ' .active');
            if (!actives || !actives[1])
                return;

            var len = actives[1].offsetTop - actives[0].offsetTop;
            element.scrollTop = element.scrollTop % len + len;
        }

        var last = undefined;
        self.on('wheel', function (details, method) {
            if (!details || !details.node)
                return;
            if (last != details.node.scrollTop) {
                last = details.node.scrollTop;
                if (method == 'setHours') fixOverscroll('.hours');
                if (method == 'setMinutes') fixOverscroll('.minutes');
                debouncedSnap(details.node, method);
            }
        });
    },

    // prevent computation errors for weird
    date: function () {
        var d = this.get('date');
        if (d instanceof Date)
            return d;
    }

});

