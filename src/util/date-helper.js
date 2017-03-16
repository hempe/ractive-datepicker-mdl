module.exports = (function () {
    return {
        setMinutes: function (date, increment, minutes) {
            console.info("Set minutes to %o", minutes);
            minutes = Number(minutes) % 60;
            if (isNaN(minutes))
                minutes = date.getMinutes();
            minutes = Math.round(minutes / increment) * increment;
            date.setMinutes(minutes);
            return date;
        },
        setHours: function (date, hourFormat, hours) {
            console.info("Set hours to %o", hours);
            setHours = Number(hours) % 24;
            if (isNaN(hours))
                hours = date.getHours();
            date.setHours(hours);
            return date;
        }
    };
})();