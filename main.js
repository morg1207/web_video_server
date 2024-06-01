var app = new Vue({
    el: '#app',
    // storing the state of the page
    data: {
        // ros conection
        connected: false,
        activatedWaypointsDrive: false,
        ros: null,
        logs: [],
        loading: false,
        rosbridge_address: 'wss://i-0487e71a2d8671d41.robotigniteacademy.com/ebc29a93-6b7a-4ca4-bf27-5498f7a53ad6/rosbridge/',
        port: '9090',
        // dragging data
        dragging: false,
        x: 'no',
        y: 'no',
        dragCircleStyle: {
            margin: '0px',
            top: '0px',
            left: '0px',
            display: 'none',
            width: '75px',
            height: '75px',
        },
        // joystick valules
        joystick: {
            vertical: 0,
            horizontal: 0,
        },
        // publisher
        pubInterval: null,

        //map
        mapViewer: null,
        mapGridClient: null,
        interval: null, 
        // 3D stuff
        viewer: null,
        tfClient: null,
        urdfClient: null,

        //waypoints

        waypoints: [
          { x: 0.150, y: -0.5 },
          { x: 0.65, y: -0.5},
          { x: 0.65, y: 0.5 },
          { x: 0.150, y: 0.5},
          { x: 0.150, y: -0.02},
          { x: -0.15, y: -0.02},
          { x: -0.15, y: 0.5},
          { x: -0.55, y: 0.5},
          { x: -0.15, y: -0.50},
          { x: -0.55, y: -0.50}
          // Add more waypoints as needed
        ],
        waypoints_canvas: [
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: ''},
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: ''},
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' },
          { x: 0.0, y: 0.0, color: 'red',showText: false, text: '' }
          // Add more waypoints as needed
        ],
        waypointsStyle: {
            size: 10,  
            origin_y: 100, 
            origin_x: 100,     
        },
        canvasStyle: {
            width: 400,
            height: 400,
            scale: 2,
        },
        image: null,  // Variable para almacenar la imagen
        
        robotModelStyle: {
            margin: '0px',
            top: '0px',
            left: '0px',
            display: 'none',
            width: '75px',
            height: '75px',
        },
        // ---------Actions config----------
        goal: null,
        action: {
            goal: { position: {x: 0, y: 0, z: 0} },
            feedback: { position: 0, state: 'idle' },
            result: { success: false },
            status: { status: 0, text: '' },
        },
        serverActionAvailable : false,
        firstSendGoal : false,
        indexGoal : 0,
        
    },
    // helper methods to connect to ROS
    methods: {
        connect: function() {
            this.loading = true
            this.ros = new ROSLIB.Ros({
                url: this.rosbridge_address
            })
            this.ros.on('connection', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Connected!')
                this.connected = true
                this.loading = false
                //publicador de velocidades
                this.pubInterval = setInterval(this.publish, 100)

                //action waypoints
                this.setWaypoints()

                //camera
                this.setCamera()

                //model 3D
                this.setup3DViewer()

                //map 
                this.setMapViewer()
                this.drawMapAction();

                //action
                this.setAction();

                //odom
                this.setOdom();


            })
            this.ros.on('error', (error) => {
                this.logs.unshift((new Date()).toTimeString() + ` - Error: ${error}`)
            })
            this.ros.on('close', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Disconnected!')
                this.connected = false
                this.loading = false
                //dejo de publicadar velocidades
                clearInterval(this.pubInterval)
                //camera
                document.getElementById('divCamera').innerHTML = ''
                //mapa
                document.getElementById('map').innerHTML = ''
                //model 3D
                document.getElementById('div3DViewer').innerHTML = ''
                //waypointsMap
                document.getElementById('divCommand').innerHTML = ''

            })
        },


        disconnect: function() {
            this.ros.close()
            this.goal = null
        },

        //Set waypoints
        normalizeWypointsToCanvas(){
             let i = 0;
             this.waypoints.forEach(point => {
                this.waypoints_canvas[i].y = point. x  * 100  + this.waypointsStyle.origin_y ;
                this.waypoints_canvas[i].x = point. y * 100  + this.waypointsStyle.origin_x ;
                i++;
            });
        },
        resetWaypoints(){
            this.waypoints_canvas.forEach(point => {
                point.color = 'red';
                point.showText = false;
            });
        },
        setWaypoints(){
            this.normalizeWypointsToCanvas();
            //scalar puntos
            let scale = this.canvasStyle.scale;
            this.waypoints_canvas.forEach(point => {
                point.x = point. x * scale;
                point.y = point. y * scale;
            });
            this.loadImage();
            this.drawMapAction();
            
        },
        drawMapAction(){
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw image
            if (this.image) {
                ctx.drawImage(this.image,0, 0, this.canvasStyle.width ,this.canvasStyle.height);
                //console.log("Imgen cargada");
            }
            // Draw waypoints
            this.waypoints_canvas.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x , point.y,this.waypointsStyle.size, 0, Math.PI * 2);
                ctx.fillStyle = point.color;
                ctx.fill();
                ctx.closePath();
                if (point.showText) {
                    ctx.font = '15px Arial';
                    ctx.fillStyle = 'black';
                    ctx.textAlign = 'center';
                    ctx.fillText(point.text, point.x, point.y + 15);
                }
            });
            if(this.serverActionAvailable){
                    ctx.font = '18px Arial';
                    ctx.fillStyle = 'green';
                    ctx.textAlign = 'center';
                    //ctx.fillText("Servidor de acciones disponible!!",this.canvasStyle.width-180,10);
            }
            else{
                    ctx.font = '18px Arial';
                    ctx.fillStyle = 'red';
                    ctx.textAlign = 'center';
                    //ctx.fillText("Servidor de acciones no disponible",this.canvasStyle.width-180,10);
            }
        
        },
        //Odometry subscribe
        setOdom(){
            this.connected = true
            console.log('Connection to ROSBridge established!')
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/odom',
                messageType: 'nav_msgs/Odometry'
            })
            topic.subscribe((message) => {
                const position = new ROSLIB.Vector3(
                    message.pose.pose.position.x,
                    message.pose.pose.position.y,
                    message.pose.pose.position.z
                );
                const orientation = new ROSLIB.Quaternion(
                    message.pose.pose.orientation.x,
                    message.pose.pose.orientation.y,
                    message.pose.pose.orientation.z,
                    message.pose.pose.orientation.w
                );
            });
    
        },

        //Action config
        setAction(){
        
            let check_action_server = new ROSLIB.Topic({
                ros: this.ros,
                name: '/tortoisebot_as/status',
                messageType: 'actionlib_msgs/GoalStatusArray'
            })
            check_action_server.subscribe((message) => {
                this.serverActionAvailable = true
                //console.log("Servidor de acciones diponible")
            })
        
        },
        //Map 
        setMapViewer(){
            this.mapViewer = new ROS2D.Viewer({
                divID: 'map',
                width: 420,
                height: 360
            })
            // Setup the map client.
            this.mapGridClient = new ROS2D.OccupancyGridClient({
                ros: this.ros,
                rootObject: this.mapViewer.scene,
                continuous: true,
            })
            // Scale the canvas to fit to the map
            this.mapGridClient.on('change', () => {
                this.mapViewer.scaleToDimensions(this.mapGridClient.currentGrid.width/8, this.mapGridClient.currentGrid.height/8 );
                this.mapViewer.shift(this.mapGridClient.currentGrid.pose.position.x /8, this.mapGridClient.currentGrid.pose.position.y /8)
            })
        },
        //Model 3D
        setup3DViewer() {
            this.viewer = new ROS3D.Viewer({
                background: '#cccccc',
                divID: 'div3DViewer',
                width: 420,
                height: 360,
                antialias: true,
                fixedFrame: 'odom'
            })

            // Add a grid.
            this.viewer.addObject(new ROS3D.Grid({
                color:'#0181c4',
                cellSize: 0.5,
                num_cells: 20
            }))

            // Setup a client to listen to TFs.
            this.tfClient = new ROSLIB.TFClient({
                ros: this.ros,
                angularThres: 0.01,
                transThres: 0.01,
                rate: 10.0,
                fixedFrame: 'odom'
            })

            // Setup the URDF client.
            this.urdfClient = new ROS3D.UrdfClient({
                ros: this.ros,
                param: 'robot_description',
                tfClient: this.tfClient,
                // We use "path: location.origin + location.pathname"
                // instead of "path: window.location.href" to remove query params,
                // otherwise the assets fail to load
                path: location.origin + location.pathname,
                rootObject: this.viewer.scene,
                loader: ROS3D.COLLADA_LOADER_2
            })
        },
        //camera 
        setCamera: function() {
            let without_wss = this.rosbridge_address.split('wss://')[1]
            console.log(without_wss)
            let domain = without_wss.split('/')[0] + '/' + without_wss.split('/')[1]
            console.log(domain)
            let host = domain + '/cameras'
            let viewer = new MJPEGCANVAS.Viewer({
                divID: 'divCamera',
                host: host,
                width: 320,
                height: 240,
                topic: '/camera/image_raw',
                ssl: true,
            })
        },
        //enviar velocidades
        publish: function() {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            let message = new ROSLIB.Message({
                linear: { x: this.joystick.vertical, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: -1*this.joystick.horizontal, },
            })
            topic.publish(message)
        },
        // funciones para el joystick 
        startDrag() {
            this.dragging = true
            this.x = this.y = 0
        },
        stopDrag() {
            this.dragging = false
            this.x = this.y = 'no'
            this.dragCircleStyle.display = 'none'
            this.resetJoystickVals()
        },
        doDrag(event) {
            if (this.dragging) {
                this.x = event.offsetX
                this.y = event.offsetY
                let ref = document.getElementById('dragstartzone')
                this.dragCircleStyle.display = 'inline-block'

                let minTop = ref.offsetTop - parseInt(this.dragCircleStyle.height) / 2
                let maxTop = minTop + 200
                let top = this.y + minTop
                this.dragCircleStyle.top = `${top}px`

                let minLeft = ref.offsetLeft - parseInt(this.dragCircleStyle.width) / 2
                let maxLeft = minLeft + 200
                let left = this.x + minLeft
                this.dragCircleStyle.left = `${left}px`
                this.setJoystickVals()
            }
        },
        setJoystickVals() {
            this.joystick.vertical = -1 * ((this.y / 200) - 0.5)
            this.joystick.horizontal = +1 * ((this.x / 200) - 0.5)
        },
        resetJoystickVals() {
            this.joystick.vertical = 0
            this.joystick.horizontal = 0
        },

        //Actions mouse events

        handleMouseMove(event) {
          const canvas = this.$refs.canvas;
          const rect = canvas.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // Check if mouse is over a point
          console.log("Estado antes de entrar a",this.action.status.status);
          if(this.action.status.status == 0 || this.action.status.status==3 || this.action.status.status==2){
            this.waypoints_canvas.forEach((point, index) => {
                const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
                if (distance <= this.waypointsStyle.size) {
                this.waypoints_canvas[index].color = 'yellow';
                this.waypoints_canvas[index].showText = true;
                this.waypoints_canvas[index].text = 'send goal';

                

                } else {
                this.waypoints_canvas[index].color = 'red';
                this.waypoints_canvas[index].showText = false;
                this.waypoints_canvas[index].text = '';
                }
            });
          }

          this.drawMapAction();
        },
        handleMouseClick(event) {
          const canvas = this.$refs.canvas;
          const rect = canvas.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // Check if click is near a point
          if((this.action.status.status == null || this.action.status.status==3 || this.action.status.status==0 || this.action.status.status==2 )){
            this.waypoints_canvas.forEach((point, index) => {
                const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
                if (distance <= this.waypointsStyle.size) {
                    this.indexGoal = index;
                    this.waypoints_canvas[index].color = 'orange';
                    this.waypoints_canvas[index].showText = true;
                    this.waypoints_canvas[index].text = 'process';
                    console.log("El point es: ", point, " el index es : ", index);
                    //enviar goal al servidor de acciones
                    this.action.goal.position.x  = this.waypoints[index].x;
                    this.action.goal.position.y  = this.waypoints[index].y;
                    console.log("El point goal es x: ", this.action.goal.position.x, " y: ", this.action.goal.position.y);
                    console.log("El estado de la accion es ",this.action.status.status);
                    this.sendGoal();
                    this.firstSendGoal = true;
                }
            });
          }
          this.drawMapAction();
        },
        loadImage() {
          // Aquí cargarías tu imagen y la almacenarías en this.image
          // Por ejemplo:

          this.image = new Image();
          this.image.src = 'scene.png';
          // Asegúrate de llamar a este método en algún lugar apropiado, como en mounted() o cuando el usuario carga una imagen.
        },
        sendGoal: function() {
            let actionClient = new ROSLIB.ActionClient({
                ros : this.ros,
                serverName : '/tortoisebot_as',
                actionName : 'course_web_dev_ros/WaypointActionAction'
                
            })

            this.goal = new ROSLIB.Goal({
                actionClient : actionClient,
                goalMessage: {
                    ...this.action.goal
                }
            })

            this.goal.on('status', (status) => {
                this.action.status = status
                console.log(this.action.status.status)
            })

            this.goal.on('feedback', (feedback) => {
                this.action.feedback = feedback
                let pos_y =  feedback.position.x  * 100  + this.waypointsStyle.origin_y 
                let pos_x  = feedback.position.x * 100  + this.waypointsStyle.origin_x 
                this.robotModelStyle.top = `${pos_y}px`
                this.robotModelStyle.left = `${pos_x}px`
                //console.log("El point goal es x: ", pos_x, " y: ", pos_y)
            })

            this.goal.on('result', (result) => {
                this.action.result = result
                this.waypoints_canvas[this.indexGoal].color = 'green'
                this.waypoints_canvas[this.indexGoal].showText = true
                this.waypoints_canvas[this.indexGoal].text = 'success'
                this.drawMapAction()
            })

            this.goal.send()
        },
        cancelGoal: function() {
            this.resetWaypoints()
            this.drawMapAction()
            this.goal.cancel()
        },
        activateControlManual: function(){
            this.activatedWaypointsDrive = false
            this.resetWaypoints()
            this.drawMapAction()
            if(this.firstSendGoal){
                this.goal.cancel()
            }
            this.pubInterval = setInterval(this.publish, 100)
        },
        activateWaypoints: function(){
            this.activatedWaypointsDrive = true
            this.drawMapAction()
            clearInterval(this.pubInterval)
        },


    },
    computed: {
        isdisabledJoystick: function () {
            return this.activatedWaypointsDrive;
        },
    },


    mounted() {
        // page is ready
        window.addEventListener('mouseup', this.stopDrag)
        this.interval = setInterval(() => {
            if (this.ros != null && this.ros.isConnected) {
                this.ros.getNodes((data) => { }, (error) => { })
            }
        }, 10000)
    },
})