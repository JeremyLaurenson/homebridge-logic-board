# "Logic Board" Plugin
The original author of this plugin bailed and hse not updated it in four years. In addition, a bug in the original code prevents the plugin from working, so I have forked a copy and fixed the bug... hance logic boiard 2

This homebridge plugin allows complex binary logic. And you'll need some knowledge of programming and javascript to use it.
It has been forked from the original which has not been updated in four years https://github.com/sbhhbs/homebridge-logic-board

As an example, I have several contact censors on door locks, and this plugin allows me to say "If all the doors are locked" turn a light on... else turn it off.
## How to install

 ```(sudo) npm install -g homebridge-logic-board```
 
## Example config.json:

 ```
    "accessories": [
        {
			"accessory": "LogicBoard",
			"name": "Logic Board Name",
			"inputs": [
				{
					"varName" : "a",
					"displayName" : "a switch"
				},
				{
					"varName" : "b",
					"displayName" : "b switch"
				}
			],
			"outputs": [
				{
					"varName" : "x",
					"displayName" : "x result"
				},
				{
					"varName" : "y",
					"displayName" : "y result"
				}
			],
			"eval": "x = a;y = a && b;"
		} 
    ]
```

All "inputs" will be interpreted as a swtich in homekit, and all "outputs" will be a occupancy sensor.
"varName" should be a valid name for variable name in js.
"eval" should be a valid js expression.


