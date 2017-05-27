G = 6.674e-11;


Coord = function (x, y) {
	this.x = x;
	this.y = y;
};

Orbit = function () {
	this.center = new Coord(0, 0);
	this.averageRadius = 1.0;
	this.eccentricity = 0.0;
	this.orbitRotationAngle = 0.0;

	this.updateFocus = function () {
		this.orbitOffset = new Coord(this.center.x - this.focusDistance * Math.cos(this.orbitRotationAngle),
			this.center.y - this.focusDistance * Math.sin(this.orbitRotationAngle)
		);
	};

	this.updateAll = function () {
		this.sepMax = this.averageRadius * (1 + this.eccentricity);
		this.sepMin = this.averageRadius * (1 - this.eccentricity);
		this.semiMajor = (this.sepMax + this.sepMin) / 2;
		this.semiMinor = this.semiMajor * Math.sqrt(1 - this.eccentricity * this.eccentricity);
		this.focusDistance = Math.sqrt(this.semiMajor * this.semiMajor - this.semiMinor * this.semiMinor);
		this.updateFocus();
	};

	this.getCoord = function (angle) {
		//values before rotation
		var originX = this.semiMajor * Math.cos(angle);
		var originY = this.semiMinor * Math.sin(angle);
		//values after rotation + offset to focus
		var x = this.orbitOffset.x + originX * Math.cos(this.orbitRotationAngle) - originY * Math.sin(this.orbitRotationAngle);
		var y = this.orbitOffset.y + originX * Math.sin(this.orbitRotationAngle) + originY * Math.cos(this.orbitRotationAngle);
		return new Coord(x, y);
	};

	this.getPlanetCoord = function (time, starMass) {
		var T = 2 * Math.PI * Math.sqrt(Math.pow(this.semiMajor, 3) / (G * starMass)); //orbital period
		var n = 2 * Math.PI / T; // mean motion
		var t = time;
		if (t > T) {
			t = t - T * Math.floor(t / T); // making t within 0..T gives better starting precision. Maybe.
		}
		var M = n * t; // mean anomaly

		//using https://en.wikipedia.org/wiki/Kepler%27s_equation#Numerical_approximation_of_inverse_problem
		//to find E (eccentric anomaly) which will be angular parameter to find current position
		var E = this.eccentricity > 0.8 ? Math.PI : M;
		var deltaE = 1.0;
		while (Math.abs(deltaE) > 1e-4) {
			deltaE = (E - this.eccentricity * Math.sin(E) - M) / (1 - this.eccentricity * Math.cos(E));
			E -= deltaE;
		}

		return this.getCoord(E);
	};
	
	this.getSpeedAtCoord = function (coord, starMass) {
		// coordinats relative to center aka star
		var x = coord.x - this.center.x;
		var y = coord.y - this.center.y;
		// distance to star
		var r = Math.sqrt(x*x + y*y);
		// using https://en.wikipedia.org/wiki/Orbital_speed#Precise_orbital_speed
		var speed = Math.sqrt(G * starMass * (2/r - 1/this.semiMajor));
		return speed;
	};
};


GraphicUtils = {
	drawCircle: function (ctx, pos, radius, fill) {
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
		if (fill)
			ctx.fill();
		ctx.stroke();
		ctx.closePath();
	},

	drawOrbit: function (ctx, orbit) {
		var coord = orbit.getCoord(0);
		ctx.beginPath();
		ctx.moveTo(coord.x, coord.y);
		for (var angle = 1; angle < 361; angle++) {
			coord = orbit.getCoord(angle * Math.PI / 180);
			ctx.lineTo(coord.x, coord.y);
		}
		ctx.stroke();
		ctx.closePath();
	}
};


window.onload = function () {
	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");
	ctx.font = '16px Arial';

	var centerX = 500;
	var centerY = 500;
	var radius = 300;
	var eccentricity = 0.9;
	var angle = 35;
	
	var starMass = 5e10;
	
	var orbit = new Orbit();
	orbit.center = new Coord(centerX, centerY);
	orbit.averageRadius = radius;
	orbit.eccentricity = eccentricity;
	orbit.orbitRotationAngle = angle * Math.PI / 180;
	orbit.updateAll();

	window.setInterval(function () {
	//window.setTimeout(function() {
		t = new Date().getTime();
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// star
		GraphicUtils.drawCircle(ctx, new Coord(centerX, centerY), 6, true);
		
		// orbit
		GraphicUtils.drawOrbit(ctx, orbit);
		
		// planet
		var coord = orbit.getPlanetCoord(t, starMass);
		GraphicUtils.drawCircle(ctx, coord, 3, true);
		
		// time
		ctx.fillText(new Date(t).toUTCString(), 10, 20);
		// coords
		ctx.fillText('x=' + coord.x.toFixed(3) + '; y=' + coord.y.toFixed(3), 10, 40);
		// speed
		var speed = orbit.getSpeedAtCoord(coord, starMass);
		ctx.fillText('speed=' + speed, 10, 60);
	}, 1000 / 30);
};