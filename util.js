var deco = function () {
    Array.from(arguments).forEach(function (f) {
      typeof f === "function" &&
        Object.keys(f.prototype).forEach(function (key) {
          var objf = f.prototype[key];
          f.prototype[key] = function () {
            console.log("start invoke " + key);
            console.log(arguments);
            console.log(this);
            return objf.apply(this, arguments);
          };
        });
    });
  };


var deco_func = function (obj, func, predict, extrafunc) {
  var originalFunc = obj[func];
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
      return originalFunc.apply(obj, arguments);
    }
  };
};


var isSameArrayObjs = (function () {
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
  })();



var createActionHistory = (function () {
  var actionStatus = {
    Undoable: 1,
    Redoable: 2,
  };

  return function (initActionId) {
    var currentActionId = initActionId;
    var undoStack = [];
    var redoStack = [];

    var currentStatus = {
      undoable: false,
      redoable: false,
    };

    var refreshUndoRedo = function (extraAction) {
      currentStatus.undoable = undoStack.length > 0;
      currentStatus.redoable = redoStack.length > 0;
      typeof extraAction === "function" && extraAction(currentStatus.undoable, currentStatus.redoable);
    };

    return {
      undo: function () {
        if (undoStack.length > 0) {
          var lastAction = undoStack.pop();
          lastAction.undoFunc();
          lastAction.state = actionStatus.Redoable;
          redoStack.push(lastAction);
          refreshUndoRedo(lastAction.extraAction);
        }
      },

      redo: function () {
        if (redoStack.length > 0) {
          var redoAction = redoStack.pop();
          (redoAction.redoFunc || redoAction.actionFunc)();
          redoAction.state = actionStatus.Undoable;
          undoStack.push(redoAction);
          refreshUndoRedo(redoAction.extraAction);
        }
      },

      reset: function (extraAction) {
        undoStack.length = 0;
        redoStack.length = 0;
        currentActionId = initActionId;
        currentStatus.undoable = false;
        currentStatus.redoable = false;
        refreshUndoRedo(extraAction);
      },

      executeAction: function (extraAction, actionFunc, undoFunc, redoFunc) {
        actionFunc = actionFunc || function () {};
        actionFunc();
        currentActionId++;

        var newAction = {
          id: currentActionId,
          state: actionStatus.Undoable,
          actionFunc: actionFunc,
          undoFunc: undoFunc,
          redoFunc: redoFunc || actionFunc,
          extraAction: extraAction,
        };    
        undoStack.push(newAction);
        redoStack.length = 0; // Clear redoStack when a new action is executed
        refreshUndoRedo(extraAction);
      },
    };
  };
})();


var createActionHistory = (function () {
  var actionStatus = {
    Undoable: 1,
    Redoable: 2,
  };
  return function (initActionId) {
    var actionHis = [],
      currentHisStatus = {
        undoable: false,
        redoable: false,
      },
      currentAction = null,
      undoableAction = null,
      redoableAction = null,
      currentActionId = initActionId,
      findUndoable = function (currentIndex) {
        while (currentIndex >= 0) {
          if (actionHis[currentIndex].state === actionStatus.Undoable) {
            return actionHis[currentIndex];
          }
          currentIndex--;
        }
        return null;
      },
      findRedoable = function (currentIndex) {
        while (currentIndex < actionHis.length) {
          if (actionHis[currentIndex].state === actionStatus.Redoable) {
            return actionHis[currentIndex];
          }
          currentIndex++;
        }
        return null;
      },
      refreshUndoRedo = function (extraAction) {
        var currentActionIndex;
        currentAction === null
          ? ((currentHisStatus.undoable = false),
            (currentHisStatus.redoable = false),
            (undoableAction = null),
            (redoableAction = null))
          : ((currentActionIndex = actionHis.indexOf(currentAction)),
            (undoableAction = findUndoable(currentActionIndex)),
            (redoableAction = findRedoable(currentActionIndex)),
            (currentHisStatus.undoable = undoableAction !== null),
            (currentHisStatus.redoable = redoableAction !== null)),
          typeof extraAction === "function" &&
            extraAction(currentHisStatus.undoable, currentHisStatus.redoable);
      };
    return {
      undo: function () {
        undoableAction && undoableAction.action();
      },
      redo: function () {
        redoableAction && redoableAction.action();
      },

      reset: function (extraAction) {
        (currentActionId = initActionId),
          (actionHis.length = 0),
          (currentAction = null),
          (currentHisStatus = {
            undoable: false,
            redoable: false,
          }),
          refreshUndoRedo(extraAction);
      },

      executeAction: function (extraAction, actionFunc, undoFunc, redoFunc) {
        actionFunc = actionFunc || function () {};
        actionFunc(),
          (currentActionId = currentActionId + 1),
          actionHis.push({
            id: currentActionId,
            state: actionStatus.Undoable,
            action: function () {
              this.state === actionStatus.Undoable
                ? (undoFunc(), (this.state = actionStatus.Redoable))
                : ((redoFunc || actionFunc)(),
                  (this.state = actionStatus.Undoable)),
                (currentAction = this),
                refreshUndoRedo(extraAction);
            },
          }),
          (currentAction = actionHis[actionHis.length - 1]),
          refreshUndoRedo(extraAction);
      },
    };
  };
})();
async function getEpicsWithoutMasterConfig() {
    const JIRA_URL = "https://aspiraconnect.atlassian.net";
    const JIRA_USER = "test";
    const JIRA_API_TOKEN = "test";
    const authHeader = "Basic " + btoa(`${JIRA_USER}:${JIRA_API_TOKEN}`);

    let epicQuery = `${JIRA_URL}/rest/api/3/search?jql=issuetype=Epic AND "Scrum Team[Dropdown]" in (AO3,AO2) and sprint in openSprints() and project ="AWO Product Development"&fields=key,summary`;

    let response = await fetch(epicQuery, {
        method: "GET",
        headers: {
            "Authorization": authHeader,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        console.error("Error fetching Epics:", await response.text());
        return;
    }
    let epics = (await response.json()).issues;
    let epicsWithoutMasterConfig = [];
    for (let epic of epics) {
        let epicKey = epic.key;
        let childIssueQuery = `${JIRA_URL}/rest/api/3/search?jql="Epic Link"=${epicKey}&fields=issuetype,summary`;
        let childResponse = await fetch(childIssueQuery, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/json"
            }
        });
        if (!childResponse.ok) {
            console.error(`Error fetching child issues for ${epicKey}:`, await childResponse.text());
            continue;
        }
        let childIssues = (await childResponse.json()).issues || [];
        let hasMasterConfig = childIssues.some(issue => issue.fields.issuetype.name.includes("Master Config"));
        if (!hasMasterConfig) {
            epicsWithoutMasterConfig.push(epicKey);
        }
    }
    console.log("Epics without 'Master Config' child issues:", epicsWithoutMasterConfig);
}
getEpicsWithoutMasterConfig();
