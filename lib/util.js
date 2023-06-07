'use strict';

exports.pad = function (num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}
