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
	renderer.render( scene, camera );
	const hud = document.getElementById('cameraPosition');
	hud.textContent = `Camera Position: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`;
}
let labelsInScene = [];

function onClick(event) {
	console.log("Clicked!"); // 添加这一行来检查点击事件是否被触发
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
		if (intersect.object.userData.type === "label") {
			showShopDetails(intersect.object);
		}
	}
	// If user clicks outside the sprite, remove the detailBox
	if (!intersects.length || intersects[0].object.userData.type !== "label") {
		const existingDetailBox = scene.getObjectByName("detailBox");
		if (existingDetailBox) {
			scene.remove(existingDetailBox);
		}
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
	labelsInScene.forEach(label => {
		scene.remove(label);
	});
	labelsInScene = [];

	const objectsToRemove = [];
	scene.traverse(child => {
		if (child.userData && (child.userData.type === "label" || child.userData.type === "line")) {
			objectsToRemove.push(child);
		}
	});
	objectsToRemove.forEach(obj => scene.remove(obj));

	const shops = [];
	const offsetHeight = 10.0;
	const labels = [];
	const offsetAngle = THREE.MathUtils.randFloatSpread(Math.PI / 4);

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
		const label = createRestaurantLabel(shop.name);
		const sprite = label.sprite;
		// 如果商铺不在 "康桥圣菲", "亚东商业广场" 和 "水平方商业广场"，则使用optimalPosition
		if (shop.place !== "康桥圣菲" && shop.place !== "亚东商业广场" && shop.place !== "水平方美食广场") {
			const optimalPosition = getExtendedSpritePosition(shop.position, scene.children);  // 可能需要根据实际情况更改scene.children为其他对象
			sprite.position.copy(optimalPosition);
		} else {
			const direction = new THREE.Vector3(Math.sin(offsetAngle), 1, Math.cos(offsetAngle)).normalize();
			sprite.position.copy(shop.position);
			sprite.position.add(direction.multiplyScalar(offsetHeight));
			sprite.position.y += offsetHeight;
		}

		sprite.layers = labelLayer;

		adjustPosition(sprite, labels);

		labels.push(sprite);

		drawConnectingLine(shop.position, sprite.position);

		sprite.scale.set(6, 4, 2);
		sprite.userData = { ...shop };
		labelsInScene.push(sprite);
		scene.add(sprite);
	});
}


function createRestaurantLabel(name) {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const fontSize = 120; // 将字体大小调整为120px
	context.font = `${fontSize}px 'Arial'`; // 使用Arial字体
	context.textBaseline = 'middle'; // 设置文本基线为中心
	context.textAlign = 'center';    // 设置文本居中
	const textWidth = context.measureText(name).width;

	const padding = 40;  // 增大内边距
	canvas.width = textWidth + 2 * padding;
	canvas.height = fontSize + 2 * padding;

	const borderRadius = 25;

	// 创建背景渐变
	const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#3e3e3e');
	gradient.addColorStop(1, '#2a2a2a');
	context.fillStyle = gradient;
	context.fillRoundRect(0, 0, canvas.width, canvas.height, borderRadius);

	// 绘制边框
	context.strokeStyle = '#f3cf44';
	context.lineWidth = 4;
	context.strokeRoundRect(0, 0, canvas.width, canvas.height, borderRadius);

	// 绘制文字
	context.fillStyle = '#f3cf44';
	context.fillText(name, canvas.width / 2, canvas.height / 2); // 调整为canvas的中心

	const texture = new THREE.CanvasTexture(canvas);
	texture.transparent = true;
	const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
	const sprite = new THREE.Sprite(spriteMaterial);
	sprite.userData.type = "label";

	return {
		sprite: sprite,
		width: canvas.width,
		height: canvas.height
	};
}

CanvasRenderingContext2D.prototype.fillRoundRect = function (x, y, w, h, r) {
	this.beginPath();
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + h, r);
	this.arcTo(x + w, y + h, x, y + h, r);
	this.arcTo(x, y + h, x, y, r);
	this.arcTo(x, y, x + w, y, r);
	this.closePath();
	this.fill();
};

CanvasRenderingContext2D.prototype.strokeRoundRect = function (x, y, w, h, r) {
	this.beginPath();
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + h, r);
	this.arcTo(x + w, y + h, x, y + h, r);
	this.arcTo(x, y + h, x, y, r);
	this.arcTo(x, y, x + w, y, r);
	this.closePath();
	this.stroke();
};


function showShopDetails(object) {
	const detailBox = document.getElementById("shop-detail-popup");

	// 更新内容
	document.getElementById("shop-name").textContent = object.userData.Name || "未知名称";
	document.getElementById("shop-address").textContent = "商店地址: " + (object.userData.Location || "未知地址");

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

// 检查标签是否与其他标签重叠并进行调整
function adjustPosition(sprite, existingLabels) {

	const padding = 0.05;
	let isOverlapping = false;

	do {
		isOverlapping = false;

		for (let existingSprite of existingLabels) {
			if (areSpritesOverlapping(sprite, existingSprite)) {
				sprite.position.y += padding;  // 向上移动标签
				isOverlapping = true;
				break;
			}
		}
	} while (isOverlapping);
}

// 判断两个sprite是否重叠
function areSpritesOverlapping(sprite1, sprite2) {
	// 假设您有一个函数来获取sprite的边界
	const bounds1 = getSpriteBounds(sprite1);
	const bounds2 = getSpriteBounds(sprite2);

	return !(bounds1.right < bounds2.left ||
		bounds1.left > bounds2.right ||
		bounds1.top < bounds2.bottom ||
		bounds1.bottom > bounds2.top);
}

// 绘制从点A到点B的线
function drawConnectingLine(pointA, pointB) {
	const d = 5; // 这是拐点距离文本框的距离，可以根据需要调整
	let elbowPos;  // 拐点的位置

	// 根据pointA和pointB的相对位置来确定拐点的位置
	if (pointA.x < pointB.x) {
		elbowPos = new THREE.Vector3(pointB.x - d, pointB.y, pointB.z);
	} else {
		elbowPos = new THREE.Vector3(pointB.x + d, pointB.y, pointB.z);
	}

	// 创建线段材料
	const lineMaterial = new THREE.LineBasicMaterial({
		color: 0xFFFFFF,
		linewidth: 0.5
	});

	// 从pointA到拐点的线段
	const geometry1 = new THREE.BufferGeometry().setFromPoints([pointA, elbowPos]);
	const line1 = new THREE.Line(geometry1, lineMaterial);
	line1.userData.type = "line";
	line1.layers.set(1);
	scene.add(line1);

	// 从拐点到pointB的线段
	const geometry2 = new THREE.BufferGeometry().setFromPoints([elbowPos, pointB]);
	const line2 = new THREE.Line(geometry2, lineMaterial);
	line2.userData.type = "line";
	line2.layers.set(1);
	scene.add(line2);
}


function getSpriteBounds(sprite) {
	const halfSize = 0.5; // 假设sprite的大小为1x1
	const position = sprite.position;
	return {
		left: position.x - halfSize,
		right: position.x + halfSize,
		top: position.y + halfSize,
		bottom: position.y - halfSize
	};
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

