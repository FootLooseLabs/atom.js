class Lexeme {
    static name = "";

    static schema = {};

    constructor(info) {
        // this.info = {...this.constructor.schema,...info};

        this.info = {...this.constructor.schema, ...this.constructor._intersection(this.constructor.schema, info)};

        // console.debug("DEBUG: LEXEME constructor : Label = ", this.get().label);
        if(!this.get().label){
            // console.debug("DEBUG: LEXEME constructor : static Label = ", this.constructor.label);
            if(this.constructor.label){
                this.get().label = this.constructor.label;
            }
        }
    }


    static _intersection(a, b) {
        var _intersectingObj = {};
        Object.keys(a).filter(k => b.hasOwnProperty(k)).forEach(k => _intersectingObj[k]=b[k]);
        return _intersectingObj;
    }

    static inflection(info, params) { //can be extended in child classes inheriting from this parent; *inflection function must return boolean value;
        // console.log("lexeme: default inflection");
        if(typeof info == "string"){
            return JSON.parse(info);
        }
        return info;
    }

    static inflect(info, params) {
        // console.log("inflecting Lexeme - ", info);
        var inflection = false;
        try{
            var inflection = this.inflection(info, params);
            // console.log("inflection = ", inflection);
        }catch(e){
            console.log(`Error: lexeme:::(${info})---(${params}) inflection failed - `, e);
            return;
        }
        if(!inflection){
            console.log("INFO: lexeme inflection function returned false.");
            return;
        }

        return new this(inflection); //if inflection is not false
    }

    // _applySchema(info) {
    //     var _intersectingObj = this.constructor._intersection(this.constructor.schema, info);
    //     return {...this.constructor.schema, _intersectingObj}
    // }

    get() {
        return this.info;
    }

    getWithLabel() {
        let info = this.get();
        info.label = this.constructor.label;
        return info;
    }

    hasKey(keyString) {
        var _this = this;
        var keyList = keyString.split(".");
        if(keyList.length == 1){
            return key in this.info;
        }

        var _info = this.info;
        var keyIdx = 0;

        var result = true;  //need to figure out a proper way for this initial value to be false (currently insecure)
        while (keyIdx < keyList.length) {
            var _keyToTest = keyList[keyIdx];
            if(_keyToTest in _info) {
                _info = _info[_keyToTest];
                i+=1;
                continue;
            }
            result = false;
            break;
        }
        return result;
    }

    hasKeys() {
        var _this = this;
        var result = true;  //need to figure out a proper way for this initial value to be false (currently insecure)
        Array.from(arguments).forEach((key)=>{
            if(!_this.hasKey(key)){valid=false};
        });
        return result;
    }

    update(info) {
        this.info = {...this.info,...info}
        return this;
    }

    getPayload() {
        return this.info;
    }

    stringify() {
      return JSON.stringify(this.info);
    }

    getValue(keyString) {
        var keyList = keyString.split(".");
        var val = this;
        for (var i = 0; i < keyList.length; i++) {
            val = val[keyList[i]];
        }
        return val;
    }


    isString(keyString){
        if(!this.hasKey(keyString)){
            return false;
        }
        if(typeof this.getValue(keyString) == "string"){
            return true;
        }
        return false;
    }

    isNumber(keyString){
        if(!this.hasKey(keyString)){
            return false;
        }
        if(typeof this.getValue(keyString) == "number"){
            return true;
        }
        return false;
    }

    isObject(keyString){
        if(!this.hasKey(keyString)){
            return false;
        }
        if(typeof this.getValue(keyString) == "objectcd"){
            return true;
        }
        return false;
    }
}

module.exports = Lexeme;