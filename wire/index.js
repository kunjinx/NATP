const path = require('path');

const ProtoBuf = require('protobufjs');

const wire = ProtoBuf.loadProtoFile(path.join(__dirname, 'wire.proto')).build();

wire.ReverseMessageType = Object.keys(wire.MessageType)
    .reduce(
        function (acc, type) {
            const code = wire.MessageType[type]
            if (!wire[type]) {
                throw new Error('wire.MessageType has unknown value "' + type + '"')
            }
            wire[type].$code = wire[type].prototype.$code = code;
            acc[code] = type;
            return acc
        }
        , Object.create(null)
    );

module.exports = wire;
