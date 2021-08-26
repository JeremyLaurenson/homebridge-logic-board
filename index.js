"use strict";
/*************************************************************************************
**** Logic Board Homebridge Plugin V0.03                                          ****
**** Originally written by Bob https://github.com/sbhhbs                          ****
**** Forked and bugfixed by Jeremy Laurenson                                      ****
**************************************************************************************/

var inherits = require('util').inherits;
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;


  Characteristic.LogicBoardVarName = function() {
	// I am using the existing plugin UUID so that folks can "upgrade" to this version of the 
	// LogicBoard plugin
	
    Characteristic.call(this, 'LogicBoard Variable Name', '00000052-0000-1000-8000-1026BB765291');
    this.setProps({
      format: Characteristic.Formats.STRING,
      perms: [Characteristic.Perms.READ]
    });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.LogicBoardVarName, Characteristic);
  Characteristic.LogicBoardVarName.UUID = '00000052-0000-1000-8000-1026BB765291';

	// Registering using the old logic board ID so that users can simply use this as a 
	// replacement for their existing configs.
  homebridge.registerAccessory("homebridge-logic-board", "LogicBoard", LogicBoard);
};


class LogicBoard {
  constructor(log, config) {
    this.log = log;
    this.name = config.name || "LogicBoard";
    this.config = config;

    this.inputSwitchServices = [];
    this.outputOccupancyServices = [];
    
    this.evalStr = config.eval;

    for (var i = 0; i < config.inputs.length; i++) {
      var one = config.inputs[i];
      var sw = this._createSwitch(one["varName"], one["displayName"], i + 1);
      this.inputSwitchServices.push(sw);
    }

    for (var i = 0; i < config.outputs.length; i++) {
      var one = config.outputs[i];
      var sw = this._createSensor(one["varName"], one["displayName"], i + 1);
      this.outputOccupancyServices.push(sw);
    }
    this.refreshAllStatus();
  }

  refreshAllStatus() {
    var remainingStatus = this.inputSwitchServices.length;
    var varMap = {};
    var resultMap = {};

    var evalueate_all = () => {
      var keys = [];
      var wholeEvalStr = '';
	  // Iterate through all the inoput variables in the config
      for (var key in varMap) {
        if (varMap.hasOwnProperty(key)) {
          keys.push(key);
		  // Add this variable and its setting to the script we will sent to javascript to execute
          var evalStr = 'var ' + key + ' = ' + varMap[key] + ';';
          wholeEvalStr = wholeEvalStr + evalStr;
        }
      }
      for (var i = 0; i < this.config.outputs.length; i++) {
        var one = this.config.outputs[i];
		// Add the output variable tot he script we will send to javascript to evaluate and default to false
        var evalStr = 'var ' + one["varName"] + ' = ' + 'false' + ';';
        wholeEvalStr = wholeEvalStr + evalStr;
      }


      wholeEvalStr +=  this.evalStr;
      this.log("evalStr: ", wholeEvalStr);
	  // Pass the evaluation script to javascript to run
      eval.call(null, wholeEvalStr);

		// For each output variable, lets get its value and populate our resultMap
      for (var i = 0; i < this.config.outputs.length; i++) {
        var one = this.config.outputs[i];
        var result = eval.call(null, one["varName"]);
        this.log(one["varName"] + ' evaluates to: ' + result);
        resultMap[one["varName"]] = result;
      }


		// Now lets iterate through our output variables and update the occupancy sensors associated
      for (var i = 0; i < this.outputOccupancyServices.length; i++) {
        var occupancyService = this.outputOccupancyServices[i];
        
        occupancyService.getCharacteristic(Characteristic.LogicBoardVarName)
        .getValue(function(err, value3) {
          if (!err) {
            var result = resultMap[value3];
            if (result) {
              occupancyService.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
            }
            else {
              occupancyService.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
            }
          }
        });
      }
    };

    var set_value = (sw, value) => {
      sw.getCharacteristic(Characteristic.LogicBoardVarName)
      .getValue(function(err, value2) {
        if (!err) {
          varMap[value2] = value;
          remainingStatus -= 1;
          if (!remainingStatus) {
            evalueate_all();
          }
        }
      });
    };


    for (var i = 0; i < this.inputSwitchServices.length; i++) {
	  // This next line was the original bug in the original statusboard.
	  // By not setting a local variable to the inputSwitchService, subsequent
	  // loops throught his could would cause all input variables to simply be
	  // overwritten by the last one looked at since this loop completes befoe
	  // the set_value executes for each loop.
	  
      let sw = this.inputSwitchServices[i];
      sw.getCharacteristic(Characteristic.On)
      .getValue(function(err, value) {
        if (!err) {
          ///console.log('set_value ' + i + ' ' + value +' for ' + JSON.stringify(sw));
          set_value(sw, value);
        }
      });
    }
  }


  _createSwitch(varName, displayName, index) {
    this.log('Create Switch: ' + displayName + ' for var: ' + varName);
    var sw = new Service.Switch(displayName, index);
    sw.setCharacteristic(Characteristic.On, false);
    sw.getCharacteristic(Characteristic.On).on('change', this.refreshAllStatus.bind(this));

    sw.addCharacteristic(Characteristic.LogicBoardVarName);
    sw.setCharacteristic(Characteristic.LogicBoardVarName, varName);

    return sw;
  }

  _createSensor(varName, displayName, index) {
    this.log('Create Sensor: ' + displayName + ' for var: ' + varName);
    var sw = new Service.OccupancySensor(displayName, index);
    sw.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    
    sw.addCharacteristic(Characteristic.LogicBoardVarName);
    sw.setCharacteristic(Characteristic.LogicBoardVarName, varName);
    return sw;
  }



  getServices() {
    var informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'github.com/jeremylaurenson')
        .setCharacteristic(Characteristic.Model, '0.0.3')
        .setCharacteristic(Characteristic.SerialNumber, '20171108001');

    return [informationService, ...this.inputSwitchServices, ...this.outputOccupancyServices]
  }
}
