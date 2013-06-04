var Ext = window.Ext4 || window.Ext;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    // entry point to app
    launch: function() {
        this._doLayout();
    },

    //initial layout of widgets
    _doLayout: function() {
        this._storyPointPicker = this.add({
            xtype: 'rallynumberfield',
            fieldLabel: 'Story Point Filter (Enter -1 for All Stories)',
            maxValue: 21,
            minValue: -1, // -1 means show all values
            value: -1, // default is show all values
            listeners: {
                change: this._onStoryPointPickerChanged,
                ready: this._onStoryPointPickerLoad,
                scope: this
            }
            
        });
 
        this._loadStories(3);
    },
    
    _onStoryPointPickerChanged: function() {
        console.log("changed story points: ", this._storyPointPicker.getValue());
        this._loadStories(this._storyPointPicker.getValue());
    },
    
        
    _onStoryPointPickerLoad: function() {
        this._loadStories(this._storyPointPicker.getValue());
    },

    // load features into store
    _loadStories: function(storyPoints) {
        console.log("Loading stories");

        var filter = Rally.data.QueryFilter.and ([{
                property: 'ScheduleState',
                operator: '>=',
                value: 'Completed'
            }, {
                property: 'Iteration.StartDate', //iterations that started in the last year
                operator: '>=',
                value: 'LastYear'
            }, {
                property: 'PlanEstimate',
                operator: '=',
                value: storyPoints
            }]);
            
        if ( storyPoints > -1 ) { //add a filter to retrieve only one value
            filter = filter.and(Ext.create('Rally.data.QueryFilter', {
                property: 'PlanEstimate',
                operator: '=',
                value: storyPoints
            }));
        } 

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'UserStory',
            filters: filter,
            autoLoad: true,
            listeners: {
                load: function(store, records, success) {
                    if ( records ) {
                        console.log("Loaded Store with %i records", records.length);
 
                        this._aggregateArray = [];
                        this._coordinateArray = [];
                        this._calculateData(records, this._aggregateArray, this._coordinateArray);
                       // this._updateGrid(store); // populate the grid
                       this._loadChart(this._coordinateArray, this._aggregateArray);
                    }
                },

                scope: this
            },

            fetch: ['Name', 'FormattedID', 'PlanEstimate', 'TaskActualTotal', 'ScheduleState', 'Iteration']
        });
    },

    _calculateData: function(records, aggArray, coordArray) {
        var maxHours = -1;
        var minHours = -1;
        var totalHours = 0;
        var avgHours = 0;
        var standardDeviation = 0;
        var foundMatch = false;
        
        console.log("calculating data");
        var iterationNames = [];
        var nextIndex = 0;
        
        Ext.Array.each(records, function(story) { // loop through stories, fetch name, collect hours & points
            var name = story.data.Name;
            var formattedID = story.data.FormattedID;
            var planEstimate = story.data.PlanEstimate;
            var taskActualTotal = story.data.TaskActualTotal;
            var scheduleState = story.data.ScheduleState;
            var currentIndex = 0; // next index to use for a newly found iteration name
            var foundMatch = false;

            var iterationName = story.get("Iteration")._refObjectName;
            // look for a match in the name array
            Ext.Array.each(iterationNames, function(element) {
                if (iterationName == element[1]) {
                    //set the index to the one already assined for this iteration name
                    currentIndex = element[0];
                    foundMatch = true;
                    console.log("Current Index: ", currentIndex);
                }
            });
           
           if (!foundMatch) { 
                currentIndex = nextIndex; // set current index to the newly created one
                iterationNames.push([currentIndex, iterationName]); // now add the new name to the array of already found iteration
                nextIndex++;
            }

            totalHours += taskActualTotal;

            if (maxHours === -1 || maxHours > taskActualTotal) {
                maxHours = taskActualTotal;
            }

            if (minHours < taskActualTotal) {
                minHours = taskActualTotal;
            }

            console.log("Name: ", name);
            console.log("ID: ", formattedID);
            console.log("PlanEstimate: ", planEstimate);
            console.log("TaskActualTotal: ", taskActualTotal);
            console.log("Schedule State: ", scheduleState);
            console.log("IterationName: ", iterationName);
            coordArray.push([currentIndex, taskActualTotal]) ;
        });

        avgHours = totalHours / records.length;
        aggArray.push(maxHours, minHours, avgHours); // populate the data needed for the chart
        console.log("IterationNames", iterationNames);
        console.log("CoordArray: ", coordArray);
    },
//-------------------//
     _loadChart: function(coordArray, aggrArray) {

        var chartConfig = {
            chart: {
                type: 'scatter',
                zoomType: 'xy'
            },
            title: {
                text: 'Accuracy Over Time'
            },
            subtitle: {
                text: 'Todd & Summer'
            },
            xAxis: {
                title: {
                    enabled: true,
                    text: 'Iteration'
                },
                startOnTick: true,
                endOnTick: true,
                showLastLabel: true,
                type: 'category'
            },
            yAxis: {
                title: {
                    text: 'Hours'
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -50,
                y: 35,
                floating: true,
                backgroundColor: '#FFFFFF',
                borderWidth: 1
            },
            plotOptions: {
                scatter: {
                    marker: {
                        radius: 5,
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: 'rgb(100,100,100)'
                            }
                        }
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: false
                            }
                        }
                    },
                    tooltip: {
                        headerFormat: '<b>{series.name}</b><br>',
                        pointFormat: '{point.x} Iteration, {point.y} Hours'
                    }
                }
            }
        };

        chart = {
            xtype: 'rallychart',
            height: 350,
            chartConfig: chartConfig,
            chartData: {
                series: [{
                    name: '3-points Stories',
                    color: 'rgba(223, 83, 83, .5)',
                    marker: { symbol: "circle" },
                    data: coordArray
                },
                    {
                    name: '5-points',
                    color: 'rgba(119, 152, 191, .5)',
                    marker: { symbol: "circle" },
                    data: [{x: 0, y: 5}, {x:0, y: 17},  {x: 0, y: 14},{x: 0, y: 2},{x: 0, y: 12},{x: 0, y: 9},{x: 0, y: 0},
                           {x: 1, y: 3}, {x: 1, y: 10},{x: 1, y: 9},{x: 1, y: 19},{x: 1, y: 8},{x: 1, y: 0},
                           {x: 2, y: 4},{x: 2, y: 9},{x: 2, y: 21},
                           {x: 3, y: 5},{x: 3, y: 6},{x: 3, y: 9},{x: 3, y: 10},
                           {x: 4, y: 19},{x: 4, y: 2},
                           {x: 5, y: 6}]
                },
                    {
                    name: 'Mean',
                    color: 'rgba(9, 110, 11, .5)',
                    marker: { symbol: "square" },
                    data: [{x: 0, y: aggrArray[2]}
                          ]
            },
                    {
                name: 'Max',
                color: 'rgba(0, 0, 0, .5)',
                marker: { symbol: "triangle" },
                data: [{x: 0, y: aggrArray[0]}
                      ]
            },
                    {
                name: 'Min',
                color: 'rgba(0, 0, 0, .5)',
                marker: { symbol: "triangle-down" },
                data: [{x: 0, y: aggrArray[1]}
                      ]
            },

                    {
                        categories: ['iteration 1 <br>StDev:6.5', 'iteration 2<br>StDev:4.9', 'iteration 3<br>StDev:4.3', 'iteration 4<br>StDev:3.8', 'iteration 5<br>StDev: 3.2', 'iteration 6<br>StDev: 2.2', 'iteration 7 <br>StDev:6.5', 'iteration 8 <br>StDev:6.5', 'iteration 9 <br>StDev:6.5', 'iteration 10 <br>StDev:5.5', 'iteration 11 <br>StDev:3.5', 'iteration 12 <br>StDev:2.5']
                    }]
            }
        };

        this.add(chart);

    },
             
//------------------
    _createGrid: function(myStore) {
        console.log("Load up a populated grid!", myStore);
        this._myGrid = Ext.create('Rally.ui.grid.Grid', {
            xtype: 'rallygrid',
            title: 'Story Grid',
            height: 500,
            store: myStore,

            columnCfgs: [{ // override ID and Name - no changes on these allowed in this grid
                text: 'Story ID',
                dataIndex: 'FormattedID',
                flex: 1,
                xtype: 'templatecolumn',
                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate') // make the ID a live link
            },

            {
                text: "Name",
                dataIndex: "Name",
                flex: 2
            }, {
                text: "PlanEstimate",
                dataIndex: "PlanEstimate",
                flex: 1
            }, {
                text: "TaskActualTotal",
                dataIndex: "TaskActualTotal",
                flex: 1
            }, {
                text: "Schedule State",
                dataIndex: "ScheduleState",
                flex: 2
            }, {
                text: "Iteration",
                dataIndex: "Iteration.Name",
                flex: 1,
                renderer: function(value, metaData, record) {
                    return record.get("Iteration")._refObjectName;
                }
            }]
        });
        this.add(this._myGrid);

    },
    _updateGrid: function(myStore) {
        if (this._myGrid === undefined) {
            this._createGrid(myStore);
        }
        else {
            this._myGrid.reconfigure(myStore);
        }
    }

});
