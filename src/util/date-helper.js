module.exports = (function () {
    return {
        setMinutes: function (date, increment, minutes) {
            var minutes = Number(minutes) % 60;
            if (isNaN(minutes))
                minutes = date.getMinutes();
            minutes = Math.round(minutes / increment) * increment;
            date.setMinutes(minutes);
            return date;
        }
    };
})();