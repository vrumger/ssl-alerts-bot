// https://github.com/HenrikJoreteg/milliseconds/blob/59c9c6854f788798521fd5cd2e826a56be2f1a7b/milliseconds.js

const calc = (multiplier, name) => value => ({
    ms: Math.round(value * multiplier),
    raw: value,
    name,
});

module.exports = {
    seconds: calc(1e3, 'seconds'),
    minutes: calc(6e4, 'minutes'),
    hours: calc(36e5, 'hours'),
    days: calc(864e5, 'days'),
    weeks: calc(6048e5, 'weeks'),
    months: calc(26298e5, 'months'),
    years: calc(315576e5, 'years'),
};
