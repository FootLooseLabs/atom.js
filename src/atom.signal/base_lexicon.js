var Lexeme = require('../atom.lexicon/main');

const LEXICON = {};

LEXICON.SignalSpec = class Lexicon extends Lexeme {
  static schema = {
    targetInterfaceLabel: null,
    signalType: "publisher", // "publisher" || "subscriber"
    channel: null
  };
}


LEXICON.SignalStatus = class Lexicon extends Lexeme {
  static schema = {
    op: null, 
    error : false, 
    message: "", 
    statusCode: 0,
    signal: null
  };
}


module.exports = LEXICON;