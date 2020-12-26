var Lexeme = require('../atom.lexicon/main');

const BASE_LEXICON = {
  "GetIntro": class Lexicon extends Lexeme {
    static schema = {
      "sender": null
    };
  },
  "Update": class Lexicon extends Lexeme {
    static schema = {
      "sender": null
    };
  },
  "Response": class Lexicon extends Lexeme {
    static schema = {
      "op": null,
      "label": null,
      "result": null,
      "message": null,
      "error": null
    };
  },

  "Advertisement": class Lexicon extends Lexeme {
    static schema = {
      name: null,
      label: null,
      address: null,
      host: null,
      port: null,
      eventsPort: null,
      lexicon: []
    }
  }
};


module.exports = BASE_LEXICON;