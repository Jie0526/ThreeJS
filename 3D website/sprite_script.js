// Declare variables
var scene, camera, renderer, clock, mixer, actions = [], mode, isWireframe = false, params, lights;
let loadedModel;
let secondModelMixer, secondModelActions = [];
let thirdModelMixer, thirdModelActions = [];
let putDownModelMixer, putDownModelActions = [];
let rollModelMixer, rollModelActions = [];
let sound, secondSound, recycleSound, putDownSound, rollSound;

init ();

function init(){

    const assetPath = './'; // Path to assets

    clock = new THREE.Clock();

    // Create the scene
    scene= new THREE.Scene();
    // 修改模型画布的颜色
    scene.background = new THREE.Color(0xfff2e0);

    // Set up the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-5, 25, 20);

    const listener = new THREE.AudioListener();
    camera.add(listener);

    // Create a sound and attach it to the listener
    sound = new THREE.Audio(listener);
    secondSound = new THREE.Audio(listener);
    recycleSound = new THREE.Audio(listener);

    // Load a sound and set it as the buffer for the Audio object
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('assets/sprite_open_can_sound.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(1.0);
    });

    // Load the second sound
    audioLoader.load('assets/sprite_can_switch_sound.mp3', function (buffer) {
        secondSound.setBuffer(buffer);
        secondSound.setLoop(false);
        secondSound.setVolume(1.0);
    });

    // Load the recycle sound
    audioLoader.load('assets/sprite_can_recycle_sound.mp3', function (buffer) { 
        recycleSound.setBuffer(buffer);
        recycleSound.setLoop(false);
        recycleSound.setVolume(1.0);
    });

    // 加载 Put down 的音效
    putDownSound = new THREE.Audio(listener);
    audioLoader.load('assets/put_down_sprite_can_sound.mp3', function (buffer) {
        putDownSound.setBuffer(buffer);
        putDownSound.setLoop(false); 
        putDownSound.setVolume(1.0);
    });

    // 加载 roll 的音效
    rollSound = new THREE.Audio(listener);
    audioLoader.load('assets/roll_sprite_can_sound.mp3', function (buffer) {
        rollSound.setBuffer(buffer);
        rollSound.setLoop(false);
        rollSound.setVolume(1.0);
    });




    // Add lighting
    const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);
    scene.add(ambient);

    lights = {};

    lights.spot = new THREE.SpotLight();
    lights.spot.visible = true;
    lights.spot.position.set(0,20,0);
    lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
    lights.spotHelper.visible = false;
    scene.add(lights.spotHelper);
    scene.add(lights.spot);

    params = {
        spot: { 
          enable: false,
          color: 0xffffff,
          distance: 20,
          angle: Math.PI/2,
          penumbra: 0,
          helper: false,
          moving: false
        }
      }

      const gui = new dat.GUI({ autoPlace: false });
      const guiContainer = document.getElementById('gui-container');
      guiContainer.appendChild(gui.domElement);

      guiContainer.style.position = 'fixed'

      const spot = gui.addFolder('Spot');
      spot.open();
      spot.add(params.spot, 'enable').onChange(value => { lights.spot.visible = value });
      spot.addColor(params.spot, 'color').onChange( value => lights.spot.color = new THREE.Color(value));
      spot.add(params.spot, 'distance').min(0).max(20).onChange( value => lights.spot.distance = value);
      spot.add(params.spot, 'angle').min(0.1).max(6.28).onChange( value => lights.spot.angle = value );
      spot.add(params.spot, 'penumbra').min(0).max(1).onChange( value => lights.spot.penumbra = value );
      spot.add(params.spot, 'helper').onChange(value => lights.spotHelper.visible = value);
      spot.add(params.spot, 'moving');

    // Set up the renderer
    const canvas = document.getElementById('threeContainer');
    renderer = new THREE.WebGLRenderer({canvas:canvas});
    renderer.setPixelRatio(window.devicePixelRatio);
    resize();

    // Add OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(1, 2, 0);
    controls.update();

    // Button to control animations
    mode = 'open';
    const btn = document.getElementById("btn");
    btn.addEventListener('click', function() {
        if (actions.length > 0) {
            if (mode === "open") {
                actions.forEach(action => {
                    action.timeScale = 1;
                    action.reset();
                    action.play();
                    // Play sound when the animation starts
                if (sound.isPlaying) sound.stop();
                sound.play();
                });
            }
        }
    });

    // Add wireframe toggle button
    const wireframeBtn = document.getElementById("toggleWireframe");
    wireframeBtn.addEventListener('click', function(){
        isWireframe = !isWireframe;
        toggleWireframe(isWireframe);
    });

    // Add rotation button logic
    const rotateBtn = document.getElementById("Rotate");
    rotateBtn.addEventListener('click', function(){
        if (loadedModel){
            const axis = new THREE.Vector3(0,1,0);
            const angle = Math.PI / 8;
            loadedModel.rotateOnAxis(axis, angle);
        } else {
            console.warn('Model not loaded yet.');
        }
    });

    // Add Switch button logic
    const switchModelBtn = document.getElementById("switchModel");
    switchModelBtn.addEventListener('click', function(){
        if (secondModelActions.length > 0 ) {
            secondModelActions.forEach(action => {
                action.reset();
                action.setloop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                //Play the sound for the second animation
                if (secondSound.isPlaying) secondSound.stop();
                secondSound.play();
            });
        } else {
            console.warn('No animation available for the second model.');
        }
    });

    // Add Recycle button logic
    const playRecycleModelBtn = document.getElementById("playRecycleModel");
    playRecycleModelBtn.addEventListener('click', function(){
        if (thirdModelActions.length > 0 ) {
            thirdModelActions.forEach(action => {
                action.reset();
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                //Play the sound for the third animation
                if (recycleSound.isPlaying) recycleSound.stop();
                recycleSound.play();
            });
        } else {
            console.warn('No animation available for the recycle model.');
        }
    });


    // Load the glTF model
    const loader = new THREE.GLTFLoader();
    function loadModel(modelPath){
        if (loadModel){
            scene.remove(loadedModel);
        }

        loader.load(modelPath, function (gltf){
            const model = gltf.scene;

            model.position.set(0,0,0);
            scene.add(model);

            loadedModel = model;

            mixer = new THREE.AnimationMixer(model);
            const animations = gltf.animations;
            actions = [];

            animations.forEach(clip => {
                const action = mixer.clipAction(clip);
                actions.push(action);
            });

            // Second model
            if (modelPath === 'assets/sprite_can_switch.glb') {
                secondModelMixer = mixer;
                secondModelActions = actions;

                secondModelActions.forEach(action => {
                    action.reset();
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    action.play();
                });
                if (secondSound.isPlaying) secondSound.stop();
                secondSound.play();
            }

            // Third model
            if (modelPath === 'assets/sprite_can_recycle.glb') {
                thirdModelMixer = mixer;
                thirdModelActions = actions;
            
                thirdModelActions.forEach(action => {
                    action.reset();
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    action.play();
                });
            
                if (recycleSound.isPlaying) recycleSound.stop();
                recycleSound.play();
            } 
            
            // Pull down moedl
            if (modelPath === 'assets/put_down_sprite_can.glb') {
                putDownModelMixer = mixer;
                putDownModelActions = actions;
                putDownModelActions.forEach(action => {
                    action.reset();
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    action.play();
                });
                if (putDownSound.isPlaying) putDownSound.stop();
                putDownSound.play();
            }

            // row model
            if (modelPath === 'assets/roll_sprite_can.glb') {
                rollModelMixer = mixer;
                rollModelActions = actions;
                rollModelActions.forEach(action => {
                    action.reset();
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    action.play();
                });
                if (rollSound.isPlaying) rollSound.stop();
                rollSound.play();
            }
        });
    }

    // First Model
    loadModel('assets/sprite_open_can.glb');

    // Second Model
    const switchBtn = document.getElementById("switchModel");
    switchBtn.addEventListener('click', function() {
        loadModel('assets/sprite_can_switch.glb');
    });

    // Third Model
    const recycleBtn = document.getElementById("playRecycleModel");
    recycleBtn.addEventListener('click', function(){
        loadModel('assets/sprite_can_recycle.glb');
    });

    // Pull down model
    const putDownBtn = document.getElementById("putDownCan");
    putDownBtn.addEventListener('click', function(){
        loadModel('assets/put_down_sprite_can.glb');
    });

    // Roll model
    const rollModelBtn = document.getElementById("rollModel");
    rollModelBtn.addEventListener('click', function(){
        loadModel('assets/roll_sprite_can.glb');
    });



    // Handle resizing
    window.addEventListener('resize',resize, false);

    // Start the animation loop
    animate();
}

function toggleWireframe(enable){
    scene.traverse(function(object){
        if (object.isMesh){
            object.material.wireframe = enable;
        }
    });
}


function animate() {
    requestAnimationFrame(animate);
  
    // Update animations for both models
    if (mixer) {mixer.update(clock.getDelta());
    if (secondModelMixer) secondModelMixer.update(clock.getDelta());
    if (thirdModelMixer) thirdModelMixer.update(clock.getDelta());
    }
  
    renderer.render(scene, camera);

    const time = clock.getElapsedTime();
    const delta = Math.sin(time)*5;
    if (params.spot.moving){ 
      lights.spot.position.x = delta;
      lights.spotHelper.update();
    }
}
  
function resize() {
    const canvas = document.getElementById('threeContainer');
    // 修改画布尺寸
    const width = 1000;
    const height = 800;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}