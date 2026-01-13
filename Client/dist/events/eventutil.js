"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventUtil = void 0;
var eventtype_1 = require("./eventtype");
var aimevent_1 = require("./aimevent");
var watchevent_1 = require("./watchevent");
var hitevent_1 = require("./hitevent");
var abortevent_1 = require("./abortevent");
var breakevent_1 = require("./breakevent");
var beginevent_1 = require("./beginevent");
var chatevent_1 = require("./chatevent");
var rejoinevent_1 = require("./rejoinevent");
var placeballevent_1 = require("./placeballevent");
var rerackevent_1 = require("./rerackevent");
var startaimevent_1 = require("./startaimevent");
var EventUtil = /** @class */ (function () {
    function EventUtil() {
    }
    EventUtil.serialise = function (event) {
        return JSON.stringify(event);
    };
    EventUtil.fromJson = function (parsed) {
        switch (parsed.type) {
            case eventtype_1.EventType.BEGIN:
                return new beginevent_1.BeginEvent();
            case eventtype_1.EventType.AIM:
                return aimevent_1.AimEvent.fromJson(parsed);
            case eventtype_1.EventType.BREAK:
                return breakevent_1.BreakEvent.fromJson(parsed);
            case eventtype_1.EventType.WATCHAIM:
                return watchevent_1.WatchEvent.fromJson(parsed.json);
            case eventtype_1.EventType.HIT:
                return hitevent_1.HitEvent.fromJson(parsed);
            case eventtype_1.EventType.CHAT:
                return chatevent_1.ChatEvent.fromJson(parsed);
            case eventtype_1.EventType.REJOIN:
                return rejoinevent_1.RejoinEvent.fromJson(parsed);
            case eventtype_1.EventType.ABORT:
                return new abortevent_1.AbortEvent();
            case eventtype_1.EventType.PLACEBALL:
                return placeballevent_1.PlaceBallEvent.fromJson(parsed);
            case eventtype_1.EventType.RERACK:
                return rerackevent_1.RerackEvent.fromJson(parsed);
            case eventtype_1.EventType.STARTAIM:
                return startaimevent_1.StartAimEvent.fromJson(parsed);
            default:
                throw Error("Unknown GameEvent :" + parsed);
        }
    };
    EventUtil.fromSerialised = function (data) {
        var parsed = JSON.parse(data);
        var event = EventUtil.fromJson(parsed);
        if ("sequence" in parsed) {
            event.sequence = parsed.sequence;
        }
        if ("clientId" in parsed) {
            event.clientId = parsed.clientId;
        }
        return event;
    };
    return EventUtil;
}());
exports.EventUtil = EventUtil;
//# sourceMappingURL=eventutil.js.map