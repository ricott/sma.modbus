'use strict';
const spacetime = require('spacetime');

const tz = 'Europe/Stockholm';

let quarterHour = spacetime.now(tz).nearest('quarter-hour');
if (!quarterHour.isAfter(spacetime.now(tz))) {
    quarterHour = quarterHour.add(10, 'minutes').nearest('quarter-hour');
}

console.log(quarterHour.unixFmt('HH:mm'));


// console.log(nearest.format('nice'));

// nearest = nearest.add(15, 'minutes');
// // console.log(nearest.format('nice'));
// console.log(nearest.unixFmt('HH:mm'));

// const now = spacetime.now(tz);
// const msToMidnight = now.diff(midnight, 'milliseconds');


const roundUpTo = roundTo => x => Math.ceil(x / roundTo) * roundTo;
const roundUpTo5Minutes = roundUpTo(1000 * 60 * 5);
const now = new Date();
const msUp = roundUpTo5Minutes(now)
console.log(now);
console.log(new Date(msUp).getHours);
