/*
This file should be altered to fit your needs.
*/

var eventStuff = {};

var lDomEl;
var sprites = {};
var vSize = {w:480, h:480};
var hAcc = -100;
var acAcc = 80;
var maxVel = 160;
var vVel = 40;
var ctrlPress = { a1 : false, a2 : false };
var lvlSize = {
	h : 30,
	spx : 16,
	visibleLines : 50,
	backPad : 10,
	totVisEl : 1
};
var victorySound = -1;
var targetCollect = 8;

var playWorld;
var introWorld;
var betweenWorld;
/*
Level data:
1 : wall
2 : collectable
*/

function CircleCollider(_gObj, _centerX, _centerY, _radius) {
	this.gObj = _gObj;
	this.centerX = _centerX;
	this.centerY = _centerY;
	this.radius = _radius;
}

function attachCircleCollider(gObj, centerX, centerY, radius) {
	gObj.collider = new CircleCollider(gObj, centerX, centerY, radius);
	return gObj;
}

function rotate(x, y, angle) {
	var si = Math.sin(angle);
	var co = Math.cos(angle);
	var rx = co * x - si * y;
	var ry = si * x + co * y;
	return {x:rx, y:ry};
}

function createBetweenWorld() {
	betweenWorld = new sitronTeGWorld();
	betweenWorld.data = {
		updated : false,
		cont : false,
		result : 0,
		dT : 0,
		chT : 1,
		domImg : {
			barely : null,
			feedMe : null,
			notEnough : null,
			plenty : null,
			queen : null
		}
	};

	var dIm = betweenWorld.data.domImg;
	var i = sitronTeGF.loadImage("assets/img/barely.png");
	dIm.barely = sitronTeGF.assets[i].domObj;
	i = sitronTeGF.loadImage("assets/img/feed_me.png");
	dIm.feedMe = sitronTeGF.assets[i].domObj;
	i = sitronTeGF.loadImage("assets/img/not_enough.png");
	dIm.notEnough = sitronTeGF.assets[i].domObj;
	i = sitronTeGF.loadImage("assets/img/queen.png");
	dIm.queen = sitronTeGF.assets[i].domObj;
	i = sitronTeGF.loadImage("assets/img/plenty.png");
	dIm.plenty = sitronTeGF.assets[i].domObj;

	betweenWorld.drawBackground = function(ctx) {
		ctx.drawImage(this.data.domImg.feedMe, 0,0,390,100,0.2,0,0.8,0.2);
		ctx.drawImage(this.data.domImg.queen, 0,0,340,340,0,0.2,0.8,0.8);
	};

	betweenWorld.drawGUI = function(ctx) {
		if (this.data.cont) {
			switch(this.data.result) {
			case -1:
				ctx.drawImage(this.data.domImg.notEnough, 0,0,650,150,0,0.7,1,0.23);
				break;
			case 0:
				ctx.drawImage(this.data.domImg.barely, 0,0,390,100,0.2,0.8,0.6,0.15);
				break;
			case 1:
				ctx.drawImage(this.data.domImg.plenty, 0,0,512,112,0.15,0.75,0.8,0.2);
				break;
			}
		}
	};

	betweenWorld.updateWorld = function(dt) {
		if (!this.data.updated) {
			this.updateCamerasTransform();
			this.data.updated = true;
			this.data.cont = false;
			this.data.dT = this.data.chT;
		} else if (this.data.dT >= 0) {
			this.data.dT -= dt;
			this.data.cont = this.data.dT < 0;

			// Only once!
			if (this.data.cont) {
				var col = sprites.player.data.collected;
				if (col < targetCollect) {
					this.data.result = -1;
					sprites.player.data.lives--;
					var lEl = document.getElementById("lives-count");
					while (lEl.firstChild) { lEl.removeChild(lEl.firstChild); }
					lEl.appendChild(document.createTextNode(sprites.player.data.lives));
					sitronTeGSounds.playSFX(sprites.player.data.sfx.die);
				} else if (col === targetCollect) {
					this.data.result = 0;
				} else {
					this.data.result = 1;
					sprites.player.data.lives++;
					var lEl = document.getElementById("lives-count");
					while (lEl.firstChild) { lEl.removeChild(lEl.firstChild); }
					lEl.appendChild(document.createTextNode(sprites.player.data.lives));
					sitronTeGSounds.playSFX(victorySound);
				}
			}

		}

		if (this.data.cont && (ctrlPress.a1 || ctrlPress.a2)) {
			nextLevel();
		}
	};

	betweenWorld.onGUIClick = function(me) {
		if (this.data.cont) {
			nextLevel();
		}
	};

	return betweenWorld;
}

function nextLevel() {
	// Reset between level screen
	betweenWorld.data.updated = false;
	betweenWorld.data.cont = false;
	betweenWorld.data.result = 0;
	betweenWorld.data.dT = 0;

	// Check for game over
	var d = sprites.player.data;
	if (d.lives >= 0) {
		playWorld.lvlData.currentLvlNo++;
		switch (playWorld.lvlData.currentLvlNo) {
		case 1:
			// Won't occur, but to establish pattern
			sitronTeGF.activeWorld = playWorld;
			loadLevel(levels.lvl01);
			break;
		case 2:
			sitronTeGF.activeWorld = playWorld;
			loadLevel(levels.lvl02);
			break;
		case 3:
			sitronTeGF.activeWorld = playWorld;
			loadLevel(levels.lvl03);
			break;
		case 4:
			sitronTeGF.activeWorld = playWorld;
			loadLevel(levels.lvl04);
			break;
		default:
			playWorld.lvlData.currentLvlNo = 1;
			sitronTeGSounds.playSFX(victorySound);
			loadIntro();
			break;
		}
	} else {
		sitronTeGSounds.playSFX(d.sfx.die);
		loadIntro();
	}
}

function createIntroWorld() {
	introWorld = new sitronTeGWorld();
	introWorld.data = {
		songId : -1,
		updated : false,
		letterImg : -1
	}
	introWorld.data.letterImg = sitronTeGF.loadImage("assets/img/letter.png");
	introWorld.data.songId = sitronTeGSounds.loadMusic("assets/sound/introsong.ogg");
	sitronTeGSounds.keepPlayingMusic = false;
	introWorld.updateWorld = function(dt) {
		if (!this.data.updated) {
			this.cameras[0].camera.updateTransform();
			sitronTeGSounds.playMusic();
			this.data.updated = true;
		}
		if (ctrlPress.a1 || ctrlPress.a2) {
			this.data.updated = false;
			startGame();
		}
	}
	introWorld.onGUIClick = function(me) {
		this.data.updated = false;
		startGame();
	}
	introWorld.drawBackground = function(ctx) {
		if (this.data.letterImg >= 0) {
			ctx.drawImage(sitronTeGF.assets[this.data.letterImg].domObj, 0,0,1,1);
		}
	}
	return introWorld;
}

function collides(gObj1, gObj2) {
	 if (typeof gObj1.collider === "undefined" || typeof gObj2.collider === "undefined") { return false; }
	 var sc1 = Math.max(Math.abs(gObj1.transform.scale.x), Math.abs(gObj1.transform.scale.y));
	 var sc2 = Math.max(Math.abs(gObj2.transform.scale.x), Math.abs(gObj2.transform.scale.y));
	 var cc1 = rotate(gObj1.collider.centerX, gObj1.collider.centerY, gObj1.transform.rotation);
	 var cc2 = rotate(gObj2.collider.centerX, gObj2.collider.centerY, gObj2.transform.rotation);
	 var dx = (gObj1.transform.position.x + cc1.x) - (gObj2.transform.position.x + cc2.x);
	 var dy = (gObj1.transform.position.y + cc1.y) - (gObj2.transform.position.y + cc2.y);
	 var rTot = gObj1.collider.radius * sc1 + gObj2.collider.radius * sc2;
	 return (dx * dx + dy * dy) < (rTot * rTot);
}

function onGUIPress(coord) {
	if (coord.x > 0.5) {
		ctrlPress.a2 = true;
	} else {
		ctrlPress.a1 = true;
	}
	return true;
}
function onGUIRelease(coord) {
	ctrlPress.a1 = false;
	ctrlPress.a2 = false;
	return true;
}

function lvlDrawGUI(ctx) {
	// Gray backround
	ctx.fillStyle="#dddddd";
	ctx.strokeStyle="#ffffff";
	ctx.lineWidth = 0.005;
	// Life and collected bars background
	ctx.strokeRect(0.15, 0.01, 0.3, 0.02);
	ctx.strokeRect(0.55, 0.01, 0.3, 0.02);
	// Life bar:
	ctx.fillRect(0.15, 0.01, 0.3*sprites.player.data.health/100, 0.02);
	// Collected bar(s)
	var col = sprites.player.data.collected / targetCollect;
	var i = 0;
	while (col > 0) {
		if (col > 1) {
			ctx.fillRect(0.55, 0.01+i*0.02, 0.3, 0.02);
		} else {
			ctx.fillRect(0.55, 0.01+i*0.02, 0.3*col, 0.02);
		}
		col -= 1;
		i++;
	}
}

function setup() {
	// Load every external resource here.
	// Create the world(s) to live in here. All game objects. All update functions. All everything.
	lDomEl = document.getElementById("sitronTeGF-body-left");
	lDomEl.appendChild(document.createTextNode("Feed the Queen:"));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createTextNode("Start loading."));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createTextNode("If you use Internet Explorer, loading may stop. This is due to lack of support for .ogg audio files. I recommend changing to Chrome, Firefox, Opera or another browser"));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createElement("br"));

	// Framework want to advertize for itself for 3 seconds, but we only wish to give it 1
	sitronTeGLoading.minTimeLeft=1;

	var lvlWorld = sitronTeGF.activeWorld;
	lvlWorld.cameras[0].camera.minViewport.width = vSize.w;
	lvlWorld.cameras[0].camera.minViewport.height = vSize.h;

	sprites.player = createPlayer();
	sprites.playerHead = createPlayerHead();
	sprites.defaultWall = createDefaultWall();
	sprites.collectable = createCollectable();

	victorySound = sitronTeGSounds.loadSFX("assets/sound/victory.ogg");

	// Camera follow character
	lvlWorld.cameras[0].update = function(dt) {
		lvlWorld.cameras[0].transform.position.x=sprites.player.transform.position.x + vSize.w/2 - 64;
		lvlWorld.cameras[0].camera.updateTransform();
	}

	// Initialize leveldata for level
	lvlWorld.lvlData = {
		currentLvl : [],
		currentLvlNo : 1,
		lastDrawnLine : 0,
		firstActiveLine : 0,
		lastDrawnLinePos : 0
	};

	// Set update function for levelworld
	lvlWorld.updateWorld = updLvlWorld;

	// First walls should be drawn, create room for them
	lvlSize.totVisEl = lvlSize.h * lvlSize.visibleLines;
	for (var i = 0; i < lvlSize.totVisEl; i++) {
		lvlWorld.gameObjects[i] = null;
	}

	// Next, player should be drawn, then its head
	lvlWorld.gameObjects[lvlWorld.gameObjects.length] = sprites.player;
	lvlWorld.gameObjects[lvlWorld.gameObjects.length] = sprites.playerHead;

	// Set up listeners. Button workaround because Chrome.
	eventStuff.btn = document.getElementById("sitronTeGF-header");
	/* 
	// Unforetunately, we loose focus when we click on canvas.
	eventStuff.btn.addEventListener("focus", function() {
		sitronTeGF.resume();
	});
	eventStuff.btn.addEventListener("blur", function() {
		sitronTeGF.pause();
	});
	*/
	document.getElementById("sitronTeGF-content").addEventListener("click", function() {
		eventStuff.btn.focus();
	});
	eventStuff.btn.addEventListener("keydown", function(arg) {
		if (typeof arg.key !== "undefined") {
			switch (arg.key) {
			case "a":
			case "A":
				ctrlPress.a1 = true;
				break;
			case "s":
			case "S":
				ctrlPress.a2 = true;
				break;
			}
		} else {
			switch (arg.keyCode) {
			case 65:
				ctrlPress.a1 = true;
				break;
			case 83:
				ctrlPress.a2 = true;
				break;
			}
		}
	});
	eventStuff.btn.addEventListener("keyup", function(arg) {
		if (typeof arg.key !== "undefined") {
			switch (arg.key) {
			case "a":
			case "A":
				ctrlPress.a1 = false;
				break;
			case "s":
			case "S":
				ctrlPress.a2 = false;
				break;
			}
		} else {
			switch (arg.keyCode) {
			case 65:
				ctrlPress.a1 = false;
				break;
			case 83:
				ctrlPress.a2 = false;
				break;
			}
		}
	});
	lvlWorld.onGUIPress = onGUIPress;
	lvlWorld.onGUIRelease = onGUIRelease;

	// Make sure we can draw life bars etc
	lvlWorld.drawGUI = lvlDrawGUI;
	playWorld = lvlWorld;

	// Set up intro as start
	sitronTeGF.activeWorld = createIntroWorld();
	createBetweenWorld();

	lDomEl.appendChild(document.createTextNode("Wait for loading to complete."));
	lDomEl.appendChild(document.createElement("br"));
	lDomEl.appendChild(document.createTextNode("When completed, select start."));
}

function start() {
	// Called after everything has loaded, after user pressed start interaction. Set up menus here.
	playWorld.updateCamerasTransform();
	introWorld.updateCamerasTransform();
	betweenWorld.updateCamerasTransform();

	var foot = document.getElementById("sitronTeGF-footer");
	// Make sure we are clean
	while (foot.firstChild) {
		foot.removeChild(foot.firstChild);
	}
	// Explain the game
	var strs = [
		"Collect food for the Queen! To collect, touch food with your tounge",
		"\"a\" or Touch Left side: Fly up",
		"\"s\" or Touch Right side: Stick out tounge"
	];
	for (var i=0; i < strs.length; i++) {
		foot.appendChild(document.createTextNode(strs[i]));
		foot.appendChild(document.createElement("br"));
	}

	var menu = document.getElementById("sitronTeGF-body-left");
	while (menu.firstChild) {
		menu.removeChild(menu.firstChild);
	}

	// General info
	menu.appendChild(document.createTextNode("Lives: "));
	var spn = document.createElement("span");
	spn.id = "lives-count";
	menu.appendChild(spn);
	menu.appendChild(document.createElement("br"));
	menu.appendChild(document.createTextNode("Level: "));
	spn = document.createElement("span");
	spn.id = "level";
	menu.appendChild(spn);
	menu.appendChild(document.createElement("br"));
	menu.appendChild(document.createElement("br"));

	// Sound control:
	var slidEl = document.createElement("input");
	menu.appendChild(document.createTextNode("Music volume:"));
	menu.appendChild(document.createElement("br"));
	slidEl.type="range";
	slidEl.min=0;
	slidEl.max=100;
	slidEl.value=sitronTeGSounds.musicVolume*100;
	slidEl.addEventListener("change", function() {
		sitronTeGSounds.musicVolume=this.value/100;
		if (sitronTeGSounds.activeSong >= 0) {
			// TODO Add this functionality to framework
			sitronTeGF.assets[sitronTeGSounds.music[sitronTeGSounds.activeSong]].domObj.volume=sitronTeGSounds.musicVolume;
		}
	});
	menu.appendChild(slidEl);
	menu.appendChild(document.createElement("br"));
	slidEl = document.createElement("input");
	menu.appendChild(document.createTextNode("SFX volume:"));
	menu.appendChild(document.createElement("br"));
	slidEl.type="range";
	slidEl.min=0;
	slidEl.max=100;
	slidEl.value=sitronTeGSounds.sfxVolume*100;
	slidEl.addEventListener("change", function() {
		sitronTeGSounds.sfxVolume=this.value/100;
	});
	menu.appendChild(slidEl);
	menu.appendChild(document.createElement("br"));
}

function startGame() {
	sitronTeGSounds.stopMusic();
	sitronTeGF.activeWorld = playWorld;
	playWorld.lvlData.currentLvlNo = 1;
	loadLevel(levels.lvl01);
	sitronTeGF.activeWorld.updateCamerasTransform();
}

function createPlayerHead() {
	var h = sitronTeSpriteBuilder.buildRegularSingleImgSprite("assets/img/head.png",0,-8,16,16,8);
	var s = h.sprite;
	for (var y = 0; y < 2; y++) {
		for (var x=0; x < 4; x++) {
			var dw = x * 16;
			var dx = (x === 2) ? 16 : ((x === 3) ? 48 : 0);
			dx -= y * 16 * 4;
			var dy = y * 16;
			var si = s.spriteInfos[y*4+x];
			si.dest.w += dw;
			si.src.w += dw;
			si.src.x += dx;
			si.src.y = dy;
		}
	}

	h.data = {
		state : 0,
		imgState : 0,
		elT : 0,
		chT1 : 1,
		chT2 : 0.15,
		stT1 : 0.1,
		stT2 : 0.3,
		stT3 : 0.5,
		stT4 : 0.3,
		stT5 : 0.2,
		stTL : 0,
		sfx : {
			toungeOut : -1,
			toungeMove : -1,
			swallow : -1
		}
	};

	var sfx = h.data.sfx;
	sfx.toungeOut = sitronTeGSounds.loadSFX("assets/sound/tounge.ogg");
	sfx.toungeMove = sitronTeGSounds.loadSFX("assets/sound/tounge_move.ogg");
	sfx.swallow = sitronTeGSounds.loadSFX("assets/sound/swallow.ogg");

	attachCircleCollider(h, 8, 0, 4);

	h.update = function(dt) {
		var d = this.data;
		// input reactions, and state changes
		if (d.state === 0) {
			if (ctrlPress.a2) {
				d.state = 1;
				d.stTL = d.stT1;
				// And sfx
				sitronTeGSounds.playSFX(d.sfx.toungeOut);
			}
		} else {
			d.stTL -= dt;
			if (d.stTL < 0) {
				d.state++;
				switch (d.state) {
				case 2:
					d.stTL = d.stT2;
					break;
				case 3:
					d.stTL = d.stT3;
					// And sound..
					sitronTeGSounds.playSFX(d.sfx.toungeMove);
					break;
				case 4:
					d.stTL = d.stT4;
					break;
				case 5:
					d.stTL = d.stT5;
					break;
				default:
					d.state = 0;
					break;
				}
			}
		}

		// Change collider position and radius based on state
		var col = this.collider;
		switch (d.state) {
		case 1:
		case 5:
			col.centerX = 26;
			col.radius = 6;
			break;
		case 2:
		case 4:
			col.centerX = 42;
			col.radius = 6;
			break;
		case 3:
			col.centerX = 56;
			col.radius = 8;
			break;
		default:
			col.centerX = 8;
			col.radius = 4;
			break;
		}

		// Move by following player
		var tr = this.transform;
		var ptr = sprites.player.transform;
		rot = rotate(29*ptr.scale.x, 0, ptr.rotation);
		tr.position.x = ptr.position.x + rot.x;
		tr.position.y = ptr.position.y + rot.y;
		tr.rotation = ptr.rotation;

		// Collisions against collectables
		// WARNING: DEPENDENT ON WHERE WE PLACE WALLS! If this is changed, also remember data type check
		for (var i=0; i<lvlSize.totVisEl && i <sitronTeGF.activeWorld.gameObjects.length; i++) {
			var other = sitronTeGF.activeWorld.gameObjects[i];
			if (other !== null) {
				if (other.data.type === 2 && collides(this, other)) {
					sprites.player.data.collected += 1;
					sitronTeGF.activeWorld.gameObjects[i] = null;
					// And sfx
					sitronTeGSounds.playSFX(d.sfx.swallow);
				}
			}
		}

		// Animation stuff:
		d.elT += dt;
		if (d.imgState === 0) {
			if (d.elT > d.chT1) {
				d.elT -= d.chT1;
				d.imgState = 1;
			}
		} else {
			if (d.elT > d.chT2) {
				d.elT -= d.chT2;
				d.imgState = 0;
			}
		}
		var stImg = 0;
		switch (d.state) {
		case 1:
		case 5:
			stImg = 1;
			break;
		case 2:
		case 4:
			stImg = 2;
			break;
		case 3:
			stImg = 3;
			break;
		}
		this.sprite.currentImage = 4 * d.imgState + stImg;
	};
	return h;
}

function createCollectable() {
	var c = sitronTeSpriteBuilder.buildRegularSingleImgSprite("assets/img/collectable.png", -8, -8, 16, 16, 2);
	c.data = {
		type : 2,
		elT : 0,
		chT : 0.2
	};
	attachCircleCollider(c, 0, 0, 8);
	c.update = function(dt) {
		var d = this.data;
		d.elT += dt;
		if (d.elT > d.chT) {
			d.elT -= d.chT;
			var s = this.sprite;
			s.currentImage = (s.currentImage + 1) % s.images.length;
		}
	};
	return c;
}
function copyCollectable(src) {
	var cp = sitronTeSpriteBuilder.buildEmptySprite();
	cp.sprite.images = src.sprite.images;
	cp.sprite.spriteInfos = src.sprite.spriteInfos;
	cp.sprite.currentImage = src.sprite.currentImage;
	cp.data = {
		type : src.data.type,
		elT : src.data.elT,
		chT : src.data.chT
	};
	cp.collider = src.collider;
	cp.update = src.update;
	return cp;
}

function playerDied() {
	var d = sprites.player.data;
	d.lives--;
	sitronTeGSounds.playSFX(d.sfx.die);
	if (d.lives >= 0) {
		loadLevel(playWorld.lvlData.currentLvl);
	} else {
		loadIntro();
	}
}

function loadIntro() {
	sprites.player.data.lives = 2;
	sitronTeGF.activeWorld = introWorld;
}

function createPlayer() {
	var r = sitronTeSpriteBuilder.buildRegularSingleImgSprite("assets/img/player.png", -32, -16, 64, 32, 3);
	r.data = {
		elT : 0,
		chT : 0.15,
		ha : hAcc,
		hv : 0,
		vv : vVel,
		health : 100,
		lives : 2,
		collected : 0,
		sfx : {
			die : -1,
			flapWeak : -1,
			flapStrong : -1
		}
	};

	// Sounds, player sprite. See also player head sprite
	var sfx = r.data.sfx;
	sfx.die = sitronTeGSounds.loadSFX("assets/sound/die.ogg");
	sfx.flapWeak = sitronTeGSounds.loadSFX("assets/sound/flap_weak.ogg");
	sfx.flapStrong = sitronTeGSounds.loadSFX("assets/sound/flap_strong.ogg");
	

	attachCircleCollider(r, 0, 0, 15);
	r.update = function(dt) {
		// Data object, describing state
		var d = this.data;

		// Update scale, remember negative y to fix image orientation
		var sc = 1 + d.collected * 0.1;
		this.transform.scale.x = sc;
		this.transform.scale.y = -sc;

		// Dependent on active buttons:
		d.ha = ctrlPress.a1 ? acAcc : hAcc;

		// physics
		d.hv += dt*d.ha;
		if (d.hv > maxVel) {
			d.hv = maxVel;
		} else if (d.hv < -maxVel) {
			d.hv = -maxVel;
		}
		this.transform.position.y+=dt*d.hv;
		this.transform.position.x+=dt*d.vv;
		this.transform.rotation = Math.atan2(d.hv, d.vv);

		// Collisions against walls
		// WARNING DEPENDENT ON WHERE WE PLACE WALLS! If this is changed, also remember data type check
		var cont = true;
		for (var i=0; i<lvlSize.totVisEl && cont && i < sitronTeGF.activeWorld.gameObjects.length; i++) {
			var other = sitronTeGF.activeWorld.gameObjects[i];
			if (other !== null) {
				if (other.data.type === 1 && collides(this, other)) {
					d.health -= dt * 850;
					cont = false;
				}
			}
		}

		// Animation and sound
		d.elT+=dt;
		if (d.elT > d.chT) {
			d.elT -= d.chT;
			var s = this.sprite;
			s.currentImage = (s.currentImage+1)%s.images.length;
			if (s.currentImage === 1) {
				if (ctrlPress.a1) {
					sitronTeGSounds.playSFX(d.sfx.flapStrong);
				} else {
					sitronTeGSounds.playSFX(d.sfx.flapWeak);
				}
			}
		}

		// Check if player has survived
		if (d.health < 0) {
			playerDied();
		}
	};
	return r;
}

function createDefaultWall() {
	var w = sitronTeSpriteBuilder.buildSimpleSprite("assets/img/ground.png", -16, -16, 32, 32);
	w.data = {
		type : 1
	};
	attachCircleCollider(w, 0, 0, 14);
	return w;
}
function copyWall(src) {
	var cp = new sitronTeGObj();
	cp.data = src.data;
	cp.update = src.update;
	cp.draw = src.draw;
	cp.sprite = src.sprite;
	cp.collider = src.collider;
	return cp;
}

function getLvlSprite(type, posX, posY) {
	var r = null;
	switch (type) {
	case 1:
		r = copyWall(sprites.defaultWall);
		r.transform.position.x = posX;
		r.transform.position.y = posY;
		break;
	case 2:
		r = copyCollectable(sprites.collectable);
		r.transform.position.x = posX;
		r.transform.position.y = posY;
		break;
	}
	return r;
}
function loadLevel(lvl) {
	lvlWorld = sitronTeGF.activeWorld;
	// Reset level
	lvlWorld.gameObjects.length = 0;
	lvlWorld.lvlData.currentLvl = lvl;
	lvlWorld.lvlData.firstActiveLine = 0;
	lvlWorld.lvlData.lastDrawnLine = lvlSize.visibleLines - 1;
	lvlWorld.lvlData.lastDrawnLinePos = lvlSize.visibleLines - 1;
	// Reset player
	sprites.player.transform.position.x=0;
	sprites.player.transform.position.y=0;
	sprites.player.sprite.currentImage=0;
	sprites.player.data.elT=0;
	sprites.player.data.hv=0;
	sprites.player.data.vv=vVel;
	sprites.player.data.health=100;
	sprites.player.data.collected=0;
	// Load initial level data
	for (var x=0; x < lvlSize.visibleLines; x++) {
		var posX = x * lvlSize.spx;
		for (var y=0; y < lvlSize.h; y++) {
			var pdat = lvl.length > x ? lvl[x][y] : 0;
			var posY = (y - lvlSize.h/2) * lvlSize.spx;
			lvlWorld.gameObjects[lvlWorld.gameObjects.length] = getLvlSprite(pdat, posX, posY);
		}
	}
	// Set player, with head in world
	lvlWorld.gameObjects[lvlWorld.gameObjects.length] = sprites.player;
	lvlWorld.gameObjects[lvlWorld.gameObjects.length] = sprites.playerHead;
	// Update dom with info
	var livesEl = document.getElementById("lives-count");
	while (livesEl.firstChild) { livesEl.removeChild(livesEl.firstChild); }
	var lvlEl = document.getElementById("level");
	while (lvlEl.firstChild) { lvlEl.removeChild(lvlEl.firstChild); }
	livesEl.appendChild(document.createTextNode(sprites.player.data.lives));
	lvlEl.appendChild(document.createTextNode(lvlWorld.lvlData.currentLvlNo));
}

function updLvlWorld(dt) {
	var firstLX = this.lvlData.firstActiveLine * lvlSize.spx;
	if ((sprites.player.transform.position.x - firstLX) > (lvlSize.backPad * lvlSize.spx)) {
		this.lvlData.lastDrawnLinePos = (this.lvlData.lastDrawnLinePos + 1) % lvlSize.visibleLines;
		this.lvlData.lastDrawnLine++;
		this.lvlData.firstActiveLine++;
		var posX = this.lvlData.lastDrawnLine * lvlSize.spx;
		var lvl = this.lvlData.currentLvl;
		var more = lvl.length > this.lvlData.lastDrawnLine;
		for (var y = 0; y < lvlSize.h; y++) {
			var pdat = more ? lvl[this.lvlData.lastDrawnLine][y] : 0;
			var posY = (y - lvlSize.h/2) * lvlSize.spx;
			lvlWorld.gameObjects[this.lvlData.lastDrawnLinePos * lvlSize.h + y] = getLvlSprite(pdat, posX, posY);
		}
		if ((this.lvlData.firstActiveLine + lvlSize.backPad) >= lvl.length) {
			sitronTeGSounds.playSFX(victorySound);
			sitronTeGF.activeWorld = betweenWorld;
		}
	}
}
