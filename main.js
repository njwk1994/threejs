import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as TWEEN from '@tweenjs/tween.js';

const mainButtons = [
	{ name: "水平方商业广场", cameraPosition: new THREE.Vector3(409.58,64.37,-295.53), lookAt: new THREE.Vector3(/* x2, y2, z2 */),subButtons: ["餐饮美食", "超市便利", "生活服务", "甜品饮品", "特色推荐"] },
	{
		name: "九霄梦天地",
		cameraPosition: new THREE.Vector3(546.46,99.23,-32.35),
		lookAt: new THREE.Vector3(),
		subButtons: [
			{
				name: "九霄A座",
				floors: Array.from({length: 12}, (_, i) => `九霄A塔楼${i + 8}楼`)
			},
			{
				name: "九霄B座",
				floors: Array.from({length: 8}, (_, i) => `九霄B塔楼${i + 8}楼`)
			},
			{
				name: "九霄主楼",
				floors: ["九霄梦天地"]
			}
		]
	},
	{ name: "康桥圣菲", cameraPosition: new THREE.Vector3(372.71,84.12,-222.22),lookAt: new THREE.Vector3(-469.41, 40.18, -181.00), subButtons: ["餐饮美食", "超市便利", "生活服务", "甜品饮品", "特色推荐"] },
	{ name: "亚东西区", cameraPosition: new THREE.Vector3(-160.75,85,-158.79),lookAt: new THREE.Vector3(-729,45,-4 ), subButtons: ["餐饮美食", "超市便利", "生活服务", "甜品饮品", "特色推荐"] }
];

const cameraSettings = {
	position: new THREE.Vector3(),
	lookAt: new THREE.Vector3()
};

let camera, scene, renderer, raycaster, mouse, labelLayer, controls;
let labelsInScene = [];
let connectingLines = [];

init();
render();

function init() {
	const container = document.createElement( 'div' );
	const backButton = createButton('返回', window.innerHeight - 60);
	backButton.style.display = 'none';  // Initially hidden
	document.body.appendChild(backButton);
	document.body.appendChild( container );
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 10000 );
	camera.position.set( 663.27, 95.65, -262.81 );
	camera.addEventListener('update', function() {
		refreshLabelsAndLines();
	});
	scene = new THREE.Scene();
	new RGBELoader()
		.setPath( './public/environment/' )
		.load( 'rustig_koppie_puresky_4k.hdr', function ( texture ) {
			texture.mapping = THREE.EquirectangularReflectionMapping;
			scene.background = texture;
			scene.environment = texture;
			render();
			// model
			const loader = new GLTFLoader().setPath( './public/model/' );
			loader.load( '亚东智慧商圈-合.glb', function ( gltf ) {
				scene.add( gltf.scene );
				render();
			} );
		} );
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1;
	renderer.outputEncoding = THREE.sRGBEncoding;
	container.appendChild( renderer.domElement );
	renderer.domElement.addEventListener('click', onClick);
	let topPosition = 20;
	mainButtons.forEach((buttonData, index) => {
		const button = createButton(buttonData.name, topPosition);
		button.addEventListener('click', function() {
			handleMainButtonClick(buttonData, backButton);
		});
		topPosition += 60;
	});
	controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render ); // use if there is no animation loop
	controls.minDistance = 1;
	controls.maxDistance = 100000;
	controls.target.set( 0, 0, - 0.2 );
	controls.update();
	raycaster = new THREE.Raycaster();
	raycaster.params.Sprite = {};
	mouse = new THREE.Vector2();
	window.addEventListener( 'resize', onWindowResize );
	//window.addEventListener('click', onClick, false);
	labelLayer = new THREE.Layers();
	labelLayer.set(1);
	backButton.addEventListener('click', function() {
		// Hide sub buttons and the back button
		backButton.style.display = 'none';
		mainButtons.forEach(buttonData => {
			buttonData.subButtons.forEach(subButtonName => {
				const existingSubButton = document.querySelector(`div[data-name="${subButtonName}"]`);
				if (existingSubButton) document.body.removeChild(existingSubButton);
			});
		});
		// Show main buttons
		mainButtons.forEach((buttonData, index) => {
			const button = createButton(buttonData.name, 20 + index * 60);
			button.addEventListener('click', function() {
				handleMainButtonClick(buttonData, backButton);
			});
		});
	});
	animate();
	camera.layers.enable(1);
}

function animate() {
	requestAnimationFrame(animate);
	TWEEN.update();
	render();
}

function handleMainButtonClick(buttonData, backButton) {
	animateCameraToPosition(buttonData.cameraPosition, buttonData.lookAt);
	controls.update();
	mainButtons.forEach(mainButton => {
		const existingButton = document.querySelector(`div[data-name="${mainButton.name}"]`);
		if (existingButton) document.body.removeChild(existingButton);
	});
	if (buttonData.name === "九霄梦天地") {
		buttonData.subButtons.forEach((subButtonData, subIndex) => {
			const subButton = createButton(subButtonData.name, 20 + subIndex * 60);
			subButton.addEventListener('click', function() {
				// 先移除所有的子按钮
				buttonData.subButtons.forEach(innerSubButtonData => {
					const existingSubButton = document.querySelector(`div[data-name="${innerSubButtonData.name}"]`);
					if (existingSubButton) document.body.removeChild(existingSubButton);
				});

				if (subButtonData.floors) {
					backButton.style.display = 'none';
					subButtonData.floors.forEach((floorName, floorIndex) => {
						const floorButton = createButton(floorName, 20 + floorIndex * 60);
						floorButton.addEventListener('click', function() {
							showShops(floorName, null);
						});
					});
					// 在楼层按钮之下添加一个返回按钮
					const returnButton = createButton('返回', 20 + subButtonData.floors.length * 60);
					returnButton.addEventListener('click', function() {
						// 移除所有楼层按钮
						subButtonData.floors.forEach(floorName => {
							const existingFloorButton = document.querySelector(`div[data-name="${floorName}"]`);
							if (existingFloorButton) document.body.removeChild(existingFloorButton);
						});
						// 移除返回按钮
						document.body.removeChild(returnButton);
						// 重新显示原先的子按钮
						handleMainButtonClick(buttonData, backButton);
						// 重新显示外部的返回按钮
						backButton.style.display = 'block';
					});
				}
			});
		});
	} else {
		const placeMapping = {
			"水平方商业广场": "水平方美食广场",
			"康桥圣菲": "康桥圣菲",
			"亚东西区": "亚东商业广场"
		};
		buttonData.subButtons.forEach((subButtonName, subIndex) => {
			const subButton = createButton(subButtonName, 20 + subIndex * 60);
			subButton.addEventListener('click', function() {
				showShops(placeMapping[buttonData.name], subButtonName);
			});
		});
	}

	backButton.style.display = 'block';
}

function refreshLabelsAndLines() {
	labelsInScene.forEach(shop => {
		const position2D = get2DCoordinates(shop.buttonPosition, camera);
		const button = document.querySelector(`.shop-button[data-name="${shop.name}"]`);

		if(button) {
			button.style.left = position2D.x + 'px';
			button.style.top = position2D.y + 'px';
		}
	});
	updateConnectingLines();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
	backButton.style.top = (window.innerHeight - 60) + 'px';
}

function createButton(text, topPosition) {
	const button = document.createElement('div');
	button.innerText = text;
	button.style.position = 'absolute';
	button.style.top = topPosition + 'px';
	button.style.right = '20px';
	button.style.padding = '10px 20px';
	button.style.backgroundColor = 'rgba(255, 215, 0, 0.5)'; // 淡金色透明背景
	button.style.color = 'white';
	button.style.borderRadius = '5px';
	button.style.cursor = 'pointer';
	button.style.marginBottom = '10px'; // 为每个按钮添加一些底部边距，使其分开
	button.setAttribute('data-name', text);
	document.body.appendChild(button);
	return button;
}

function render() {
	TWEEN.update();
	renderer.render(scene, camera);
	const hud = document.getElementById('cameraPosition');
	hud.textContent = `Camera Position: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`;
	updateConnectingLines();
	// 更新商铺的位置
	labelsInScene.forEach(shop => {
		const position2D = get2DCoordinates(shop.position, camera);
		const button = document.querySelector(`button[data-name="${shop.name}"]`);
		if (button) {
			button.style.left = position2D.x + 'px';
			button.style.top = position2D.y + 'px';
		}
	});
}


function onClick(event) {
	console.log("Clicked!"); // 添加这一行来检查点击事件是否被触发
	console.log(labelsInScene.length);
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObjects(labelsInScene, true); // 直接检查与labelsInScene中的对象的交集
	const existingBox = document.querySelector(".detail-box");
	if (existingBox) {
		document.body.removeChild(existingBox);
	}
	if (intersects.length > 0) {
		const intersect = intersects[0];
		// 检查交集对象是否具有type属性，并且该属性的值为"label"
		if (intersect.object.userData && intersect.object.userData.type === "label") {
			showShopDetails(intersect.object);
		}
	}
	// If user clicks outside the sprite, remove the detailBox
	else {
		closeShopDetails();
	}
}

function animateCameraToPosition(targetPosition, targetLookAt) {
	const duration = 2000;  // 动画持续时间，例如2000ms

	// 设置初始值
	cameraSettings.position.copy(camera.position);
	cameraSettings.lookAt.copy(camera.getWorldDirection(new THREE.Vector3()).add(camera.position));

	new TWEEN.Tween(cameraSettings.position)
		.to({
			x: targetPosition.x,
			y: targetPosition.y,
			z: targetPosition.z
		}, duration)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => {
			camera.position.copy(cameraSettings.position);
		})
		.start();

	new TWEEN.Tween(cameraSettings.lookAt)
		.to({
			x: targetLookAt.x,
			y: targetLookAt.y,
			z: targetLookAt.z
		}, duration)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => {
			camera.lookAt(cameraSettings.lookAt);
		})
		.onComplete(() => {
			// 当动画完成时，更新OrbitControls的目标
			controls.target.copy(targetLookAt);
		})
		.start();
}


function showShops(place, category) {
	// 清除场景中的标签
	labelsInScene.forEach(label => {
		scene.remove(label);
	});
	labelsInScene = [];
	const offsetHeight = 1.0;  // 设置偏移高度
	const offsetAngle = THREE.MathUtils.randFloatSpread(Math.PI / 4);  // 设置偏移角度
	// 删除现有的HTML按钮
	const existingButtons = document.querySelectorAll('.shop-button');
	existingButtons.forEach(button => document.body.removeChild(button));

	const shops = [];
	scene.traverse(child => {
		if (child.userData && (place === null || child.userData.Place === place) && (category === null || child.userData.Category === category)) {
			shops.push({
				name: child.userData.Name,
				place: child.userData.Place,
				location: child.userData.Location || "未知地址",
				phone: child.userData.Phone || "未知电话",
				position: child.position.clone()
			});
		}
	});

	shops.forEach(shop => {
		const button = createRestaurantLabel(shop.name);
		let position2D;
		let spritePosition; // 用于确定连接线的终点位置

		if (shop.place !== "康桥圣菲" && shop.place !== "亚东商业广场" && shop.place !== "水平方美食广场") {
			const optimalPosition = getExtendedSpritePosition(shop.position, scene.children);
			spritePosition = optimalPosition;
		} else {
			const direction = new THREE.Vector3(Math.sin(offsetAngle), 1, Math.cos(offsetAngle)).normalize();
			spritePosition = shop.position.clone().add(direction.multiplyScalar(offsetHeight)).add(new THREE.Vector3(0, offsetHeight, 0));
		}
		position2D = get2DCoordinates(spritePosition, camera);
		// 在此处调用 drawConnectingLine 函数
		drawConnectingLine(shop.position, spritePosition);

		// 存储按钮的3D位置
		shop.buttonPosition = spritePosition;

		button.style.left = position2D.x + 'px';
		button.style.top = position2D.y + 'px';
		button.onmouseover = function() {  // 添加mouseover效果
			button.style.backgroundColor = 'rgba(255, 215, 0, 0.75)';  // 加深背景颜色
		};
		button.onmouseout = function() {  // 恢复原始颜色
			button.style.backgroundColor = 'rgba(255, 215, 0, 0.5)';
		};
		button.onclick = function() {
			showShopDetails(shop);
		};

		labelsInScene.push(shop);
	});
	refreshLabelsAndLines();
}

function get2DCoordinates(position, camera) {
	const vector = position.project(camera);
	vector.x = (vector.x + 1) / 2 * window.innerWidth;
	vector.y = -(vector.y - 1) / 2 * window.innerHeight;
	return vector;
}



function updateConnectingLines() {
	connectingLines.forEach(line => {
		scene.remove(line);
	});
	connectingLines = [];

	labelsInScene.forEach(shop => {
		const line = drawConnectingLine(shop.position, shop.buttonPosition);
		connectingLines.push(line);
	});
}


function createRestaurantLabel(shopName) {
	const button = document.createElement('button');
	button.innerText = shopName;
	button.className = 'shop-button'; // 为了后续方便地选择和删除
	button.style.position = 'absolute';
	button.style.padding = '10px 20px';
	button.style.backgroundColor = 'rgba(255, 215, 0, 0.5)'; // 淡金色透明背景
	button.style.color = 'white';
	button.style.borderRadius = '5px';
	button.style.cursor = 'pointer';
	button.style.zIndex = 100; // 确保按钮位于页面的顶部
	document.body.appendChild(button);
	button.setAttribute('data-name', shopName);
	return button;
}


function showShopDetails(object) {
	const detailBox = document.getElementById("shop-detail-popup");
	// 更新内容
	document.getElementById("shop-name").textContent = object.name || "未知名称";
	document.getElementById("shop-address").textContent = "商店地址: " + (object.location || "未知地址");

	// 设定弹窗的位置
	const rect = renderer.domElement.getBoundingClientRect();
	const widthHalf = rect.width / 2;
	const heightHalf = rect.height / 2;

	const position = object.position.clone();
	position.project(camera); // 使用新的project方法
	detailBox.style.left = (position.x * widthHalf + widthHalf) + "px";
	detailBox.style.top = (-position.y * heightHalf + heightHalf) + "px";

	detailBox.style.display = "block";
}

function closeShopDetails() {
	const detailBox = document.getElementById("shop-detail-popup");
	detailBox.style.display = "none";
}
window.closeShopDetails = closeShopDetails;

// 绘制从点A到点B的线
function drawConnectingLine(pointA, pointB) {
	const direction = new THREE.Vector3().subVectors(pointB, pointA).normalize();
	const buttonWidth = 80; // 根据实际的按钮宽度调整
	if (direction.x > 0) {
		pointB.x -= buttonWidth / 2;
	} else {
		pointB.x += buttonWidth / 2;
	}
	const lineMaterial = new THREE.LineBasicMaterial({
		color: 0xFFFFFF,
		linewidth: 0.5
	});
	const geometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
	const line = new THREE.Line(geometry, lineMaterial);
	line.layers.set(1);
	scene.add(line);
	return line;
}



function getExtendedSpritePosition(shopPosition, sceneObjects) {
	const raycaster = new THREE.Raycaster();
	const directions = [
		new THREE.Vector3(1, 0, 0),   // right
		new THREE.Vector3(-1, 0, 0),  // left
		new THREE.Vector3(0, 1, 0),   // up
		new THREE.Vector3(0, 0, 1),   // front
		new THREE.Vector3(0, 0, -1)   // back
	];

	let closestIntersection = null;
	let shortestDistance = Infinity;
	let bestDirection = null;

	directions.forEach(direction => {
		raycaster.set(shopPosition, direction);
		const intersects = raycaster.intersectObjects(sceneObjects, true);

		if (intersects.length > 0 && intersects[0].distance < shortestDistance) {
			closestIntersection = intersects[0].point;
			shortestDistance = intersects[0].distance;
			bestDirection = direction;
		}
	});

	if (closestIntersection) {
		const offset = 15;  // 可根据需要调整
		return closestIntersection.add(bestDirection.multiplyScalar(offset));
	}
	return shopPosition;  // 如果没有找到最佳位置，返回原始位置
}

