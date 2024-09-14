var util = function(logger){
    return {
        deco: function () {
            Array.from(arguments).forEach(function (f) {
              typeof f === "function" &&
                Object.keys(f.prototype).forEach(function (key) {
                  var objf = f.prototype[key];
                  f.prototype[key] = function () {
                    logger("start invoke " + key);
                    logger(arguments);
                    logger(this);
                    return objf.apply(this, arguments);
                  };
                });
            });
          },
          decofun: function (obj, func, predict, extrafunc) {
            obj[func] = function () {
              if (
                (
                  predict ||
                  function () {
                    return true;
                  }
                )(arguments)
              ) {
                extrafunc && extrafunc(arguments);
                return obj.__proto__[func].call(obj, arguments);
              }
            };
          },
          isSameArrayObjs: (function () {
            var JSONstringifyOrder = function (obj) {
              var allKeys = new Set();
              JSON.stringify(obj, (key, value) => (allKeys.add(key), value));
              return JSON.stringify(obj, Array.from(allKeys).sort());
            };
            return function (a, b) {
              a = (a || []).map(JSONstringifyOrder);
              b = (b || []).map(JSONstringifyOrder);
              return (
                a.length === b.length &&
                a.every((e) => b.includes(e)) &&
                b.every((e) => a.includes(e))
              );
            };
          })(),
          createActionHistory: function (initActionId) {
            var undoAction = [];
            var redoAction = [];
            var currentActionId = initActionId;
            var currentStatus = {
              undoable: false,
              redoable: false,
            };
            var refreshUndoRedo = function (extraAction) {
              extraAction(currentStatus.undoable, currentStatus.redoable);
            };
            return {
              undo: function () {
                var first = undoAction.pop();
                first && first.undoFunc();
                undoAction.length === 0 && (currentStatus.undoable = false);
                if (first) {
                  redoAction.push(first);
                  currentStatus.redoable = true;
                  first.extraAction(currentStatus.undoable, currentStatus.redoable);
                }
              },
              redo: function () {
                var redoFirst = redoAction.pop();
                redoFirst && redoFirst.redoFunc();
                redoAction.length === 0 && (currentStatus.redoable = false);
                if (redoFirst) {
                  undoAction.push(redoFirst);
                  currentStatus.undoable = true;
                  redoFirst.extraAction(currentStatus.undoable, currentStatus.redoable);
                }
              },
        
              reset: function (extraAction) {
                undoAction.length = 0;
                redoAction.length = 0;
                currentStatus.undoable = false;
                currentStatus.redoable = false;
                refreshUndoRedo(extraAction);
              },
        
              executeAction: function (extraAction, actionFunc, undoFunc, redoFunc) {
                actionFunc = actionFunc || function () {};
                actionFunc();
                currentActionId = currentActionId + 1;
                undoAction.push({
                  actionId: currentActionId,
                  undoFunc: undoFunc,
                  redoFunc: redoFunc || actionFunc,
                  extraAction: extraAction,
                });
                currentStatus.undoable = true;
                refreshUndoRedo(extraAction);
              },
            };
          }
        }   
};


var x = function(){
}
x.prototype.sum = function(a,b){
return  a + b;
}
util(console.log).deco(x);
console.log(new x().sum(3,4));
