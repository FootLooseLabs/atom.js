class Interface {
    static schema = {};

    constructor(msg) {
        this.msg = {...this.constructor.schema,...msg}
    }

    apply() {
        console.log("Interface applied");
    }

    hasKey(key) {
        var _this = this;
        var keyList = key.split(".");
        if(keyList.length == 1){
            return key in this.msg;
        }

        var _msg = this.msg;
        var keyIdx = 0;

        var result = true;  //need to figure out a proper way for this initial value to be false (currently insecure)
        while (keyIdx < keyList.length) {
            var _keyToTest = keyList[keyIdx];
            if(_keyToTest in _msg) {
                _msg = _msg[_keyToTest];
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

    update(msg) {
        this.msg = {...this.msg,...msg}
        return this;
    }

    getPayload() {
        return this.msg;
    }

    stringify() {
      return JSON.stringify(this.msg);
    }
}

export {
    Interface
}