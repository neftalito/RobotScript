class City {
    constructor(config) {
        this.element = config.element;
        this.storage = config.storage;
        this.storage.camera.width = this.element.clientWidth;
        this.storage.camera.height = this.element.clientHeight;
        this.canvas = this.element.querySelector(".city-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = new CityMap({city : this});
        this.view = new CameraHandler(this);
        this.isPaused = false;
        this.isRunning = false;
        this.program = null;
        this.console = config.console;
    }

    setUpProgram() {
        const extractConfig = (ast, index) => {
            const instance = ast.INSTANCES[index];
            const id = instance.identifier;
            const type = {};
            for (const robotType of ast.ROBOT_TYPES) {
                if (robotType.identifier === instance.type) {
                    type.body = robotType.body;
                    type.variables = [];
                    robotType.local_variables.forEach(variable => {
                        const init = variable.type_value === "numero"? 0 : false;
                        type.variables.push({
                            identifier : variable.identifier,
                            value : init
                        })
                    })
                    break;
                }
            }
            const areasIds = [];
            ast.INITS.assign_areas.forEach( assign => {
                if (assign.identifier === id) {
                    areasIds.push(assign.type);
                }
            })
            let x = 0;
            let y = 0;
            for (const initial of ast.INITS.initial_positions) {
                if (initial.identifier === id) {
                    x = initial.x;
                    y = initial.y;
                    break;
                }
            }
            const areas = [];
            ast.AREAS.forEach(area => {
                const idIndex = areasIds.indexOf(area.identifier);
                if (idIndex !== -1) {
                    const a = {
                        x : area.a.x * 16,
                        y : area.a.y * 16,
                    }
                    const b = {
                        x : area.b.x * 16,
                        y : area.b.y * 16,
                    }
                    areas.push({
                        a : a,
                        b : b
                    })
                }
            })
        
            while (index > 7) {
                index -= 8;
            }

            const strBody = JSON.stringify(type.body);
            const newBody = JSON.parse(strBody);
            
            const strProcedures = JSON.stringify(ast.PROCEDURES);
            const newProcedures = JSON.parse(strProcedures);
            return {
                identifier : id,
                areas : areas,
                x : x,
                y : y,
                variables : type.variables,
                statements : newBody,
                procedures : newProcedures,
                inventory : {
                    flower : 0,
                    paper : 0
                },
                src : `./src/assets/city/object/robot/robot-32x8-${index}.png`
            }
        }

        const ast = this.storage.getProgram();

        const quantity = ast.INSTANCES.length;
        const robotsConfig = [];
        for (let i=0; i< quantity; i++) {
            const config = extractConfig(ast, i);
            robotsConfig.push(config);
        }

        this.map.setAreas(ast.AREAS);
        this.map.setRobots(robotsConfig);
        this.map.setItems({
            flowers : [
                {
                x : 1,
                y : 1,
                cuantity : 9,
                },
                {
                x : 3,
                y : 1,
                cuantity : 3,
                },
                {
                x : 10,
                y : 10,
                cuantity : 1,
                },
                {
                x : 1,
                y : 4,
                cuantity : 18,
                },
            ],
            papers : [
                {
                x : 1,
                y : 1,
                cuantity : 3,
                },
                {
                x : 4,
                y : 4,
                cuantity : 3,
                },
                {
                x : 3,
                y : 15,
                cuantity : 5,
                },
                {
                x : 10,
                y : 30,
                cuantity : 10,
                },
            ]
        });
        this.map.mountObjects();
    }

    resetCity() {
        this.isRunning = false;
        this.isPaused = false;
        requestAnimationFrame(() => {});
        this.map = new CityMap({city : this});
    }
    
    pause() {
        this.isPaused = true;
    }

    startProgram() {
        const step = () => {
            if (!this.isRunning) return;

            //Clear off the canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            //Establish camera
            const cameraObject = this.map.robots.camera;

            if (this.isPaused || this.map.activeInstances === 0) this.map.robots.camera.update();
            else {
                Object.values(this.map.robots).forEach(robot => robot.update())
                if (this.map.logs.length > 0) {
                    this.console.add(this.map.logs);
                    this.map.logs = [];
                }
                if (this.map.activeInstances === 0) {
                    this.console.add([
                        {
                            state : "valid",
                            message : "Finalizo la ejecucion del programa"
                        }
                    ])
                }
            }

            //Drawing
            //  Map
            this.map.draw(this.ctx, cameraObject);
            //  Items
            Object.values(this.map.items).forEach(type => {
                Object.values(type).forEach(item => {
                    item.sprite.draw(this.ctx, cameraObject);
                });
            });
            //  Robots
            Object.values(this.map.robots).forEach(robot => {
                robot.sprite.draw(this.ctx, cameraObject);
            });

            requestAnimationFrame(() => {
                step();
            });
        }
        step();
    }

    init() {
        if (!this.isRunning) {
            this.program = this.storage.getProgram();
            this.setUpProgram();
            this.isRunning = true;
            this.console.set([{ state : "valid", message : "Comenzando ejecucion" }]);
            this.startProgram();
        }
        else {
            if (!this.isPaused) {this.console.set([{ state : "info", message : "El programa ya esta corriendo ( puede estar mal el mensaje )" }]);
            }
            else {
                this.isPaused = false;
                this.console.add([{ state : "valid", message : "Reanudando la ejecucion" }]);
                this.startProgram();
            }
        }
    }
}

export { City };