var should = require("chai").should();
var rewire = require("rewire");

global.navigator = {};
var CindyJS = require("../build/js/Cindy.plain.js");

var cdy = CindyJS({
    isNode: true,
    csconsole: null,
    geometry: [],
});

function itCmd(command, expected) {
    it(command, function () {
        String(cdy.niceprint(cdy.evalcs(command))).should.equal(expected);
    });
}

describe("Operators: format", function () {
    itCmd("format(1.23456, 0)", "1");
    itCmd("format(1.23456, 1)", "1.2");

    itCmd("format(1.23456, -1)", "1");

    // modifiers
    itCmd('format(1.23456, 2, delimiter->",")', "1,23");
    itCmd('format(exp(2*pi*i), 2, delimiter->",", truncate->false)', "1,00");
    itCmd('format(exp(2*pi*i), 2, delimiter->",", truncate->true)', "1");
});

describe("Operators: reverse", function () {
    itCmd("reverse([1, 2, 3])", "[3, 2, 1]");
    itCmd('reverse("Hello")', "olleH");
});

describe("Operators: if", function () {
    itCmd('isundefined(if(blabla,"a","b"))', "true");
    itCmd('if(true,"a","b")', "a");
    itCmd('if(false,"a","b")', "b");
});

describe("Operators: angles", function () {
    itCmd("-45°", "-45°");
    itCmd("round(37°/15°) * 15°", "30°");
    itCmd("mod(456°, 360°)", "96°");
});

describe("Operators: sequence", function () {
    itCmd("-2.5..2.5", "[-2, -1, 0, 1, 2]");
    itCmd("-1.1..1.4", "[-1, 0, 1]");
    itCmd("-1.9..1.6", "[-1, 0, 1]");
    itCmd("sum(1..10)", "55");
});

describe("Operators: length", function () {
    itCmd("length([1,2,3])", "3");
    itCmd('length("1234")', "4");
    itCmd("length(42)", "1");
    itCmd("length(var)", "0");
    itCmd("variable=1;length(variable)", "1");
});
