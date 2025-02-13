// Main Renderer Object for managing Cherry Blossom animation
var RENDERER = {
	// Initial cherry blossom count, max adding interval, and watch interval
	INIT_CHERRY_BLOSSOM_COUNT : 30,
	MAX_ADDING_INTERVAL : 10,
	WATCH_INTERVAL : 300,
	
	// Initialization function to set up parameters, events, and rendering
	init : function(){
		this.setParameters();      // Set up parameters like window, container, canvas, etc.
		this.reconstructMethods();  // Bind necessary methods to the current context
		this.setup();              // Set up the canvas and other elements
		this.bindEvent();          // Bind events (e.g., window resize)
		this.render();             // Start rendering the animation
	},

	// Set up parameters for window, container, canvas, and other initial properties
	setParameters : function(){
		this.$window = $(window);               // jQuery reference to window
		this.$container = $('#jsi-cherry-container'); // Container for the canvas
		this.$canvas = $('<canvas />');         // Create a canvas element
		this.context = this.$canvas.appendTo(this.$container).get(0).getContext('2d'); // Get the 2D drawing context
		this.cherries = [];                     // Array to hold cherry blossom objects
		this.watchIds = [];                     // Array to store timeout IDs for resizing
	},

	// Reconstruct methods to ensure they're properly bound to the context
	reconstructMethods : function(){
		this.watchWindowSize = this.watchWindowSize.bind(this);  // Bind the window resize watch function
		this.jdugeToStopResize = this.jdugeToStopResize.bind(this); // Bind the function to stop resizing
		this.render = this.render.bind(this); // Bind the render function
	},

	// Set up the animation parameters, including canvas size, and initial cherry blossoms
	setup : function(){
		this.cherries.length = 0;  // Clear any existing cherry blossoms
		this.watchIds.length = 0;  // Clear any existing timeout IDs
		this.width = this.$container.width();  // Get the width of the container
		this.height = this.$container.height(); // Get the height of the container
		this.$canvas.attr({width : this.width, height : this.height}); // Set canvas size to match container
		this.maxAddingInterval = Math.round(this.MAX_ADDING_INTERVAL * 1000 / this.width); // Calculate max interval
		this.addingInterval = this.maxAddingInterval; // Set the initial adding interval
		this.createCherries();  // Create initial cherry blossoms
	},

	// Create a set number of initial cherry blossoms based on container width
	createCherries : function(){
		for(var i = 0, length = Math.round(this.INIT_CHERRY_BLOSSOM_COUNT * this.width / 1000); i < length; i++){
			this.cherries.push(new CHERRY_BLOSSOM(this, true)); // Add new cherry blossom to the array
		}
	},

	// Watch for window size changes and clear existing timers
	watchWindowSize : function(){
		this.clearTimer(); // Clear existing timeout timers
		this.tmpWidth = this.$window.width();  // Store the current window width
		this.tmpHeight = this.$window.height(); // Store the current window height
		this.watchIds.push(setTimeout(this.jdugeToStopResize, this.WATCH_INTERVAL)); // Set a timeout to check if resizing has stopped
	},

	// Clear any existing resize timers
	clearTimer : function(){
		while(this.watchIds.length > 0){
			clearTimeout(this.watchIds.pop()); // Clear all existing timers
		}
	},

	// Determine if resizing has stopped based on the stored window dimensions
	jdugeToStopResize : function(){
		var width = this.$window.width(),
			height = this.$window.height(),
			stopped = (width == this.tmpWidth && height == this.tmpHeight);
			
		this.tmpWidth = width;
		this.tmpHeight = height;
		
		if(stopped){
			this.setup();  // If resizing stopped, re-setup the animation
		}
	},

	// Bind the window resize event to trigger the window size watcher
	bindEvent : function(){
		this.$window.on('resize', this.watchWindowSize);  // Bind resize event
	},

	// Main rendering loop, executed repeatedly with requestAnimationFrame
	render : function(){
		requestAnimationFrame(this.render);  // Request the next animation frame
		this.context.clearRect(0, 0, this.width, this.height); // Clear the canvas
		
		// Sort the cherry blossoms by their z-index (depth) for proper layering
		this.cherries.sort(function(cherry1, cherry2){
			return cherry1.z - cherry2.z;
		});

		// Render each cherry blossom on the canvas
		for(var i = this.cherries.length - 1; i >= 0; i--){
			if(!this.cherries[i].render(this.context)){  // If the cherry is no longer valid, remove it
				this.cherries.splice(i, 1);
			}
		}
		
		// Add new cherry blossoms periodically based on the adding interval
		if(--this.addingInterval == 0){
			this.addingInterval = this.maxAddingInterval;  // Reset the interval
			this.cherries.push(new CHERRY_BLOSSOM(this, false)); // Add a new cherry blossom
		}
	}
};

// Cherry Blossom Object (Individual blossom in the animation)
var CHERRY_BLOSSOM = function(renderer, isRandom){
	this.renderer = renderer;   // Reference to the main renderer
	this.init(isRandom);        // Initialize the cherry blossom with random properties if needed
};

CHERRY_BLOSSOM.prototype = {
	// Constants for the blossom's behavior and appearance
	FOCUS_POSITION : 300,   // Position at which the blossom is focused
	FAR_LIMIT : 600,        // Farthest z-index the blossom can have
	MAX_RIPPLE_COUNT : 100, // Maximum number of ripples the blossom can create
	RIPPLE_RADIUS : 100,    // Maximum radius of ripple effect
	SURFACE_RATE : 0.5,     // Rate of surface sinking effect
	SINK_OFFSET : 20,       // Offset when sinking effect is applied
	
	// Initialization function to set random properties
	init : function(isRandom){
		// Set random position, velocity, and angles for the cherry blossom's movement
		this.x = this.getRandomValue(-this.renderer.width, this.renderer.width); 
		this.y = isRandom ? this.getRandomValue(0, this.renderer.height) : this.renderer.height * 1.5; // Random Y position
		this.z = this.getRandomValue(0, this.FAR_LIMIT);  // Random z-index for depth
		this.vx = this.getRandomValue(0,4);              // Random X velocity
		this.vy = -2;                                      // Set vertical velocity to negative for upwards movement
		this.theta = this.getRandomValue(0, Math.PI * 2);  // Random angle (theta) for rotation
		this.phi = this.getRandomValue(0, Math.PI * 2);    // Random angle (phi) for rotation
		this.psi = 0;                                       // Initial psi angle for the ripple effect
		this.dpsi = this.getRandomValue(Math.PI / 600, Math.PI / 300); // Random change in psi
		this.opacity = 0;                                    // Initial opacity of the blossom
		this.endTheta = false;                               // Flag to track end of theta rotation
		this.endPhi = false;                                 // Flag to track end of phi rotation
		this.rippleCount = 0;                                // Count of ripples created by the blossom
		
		// Calculate axis properties based on the current position
		var axis = this.getAxis(),
			theta = this.theta + Math.ceil(-(this.y + this.renderer.height * this.SURFACE_RATE) / this.vy) * Math.PI / 500;
		theta %= Math.PI * 2;  // Ensure theta stays within the 0-2PI range
		
		this.offsetY = 40 * ((theta <= Math.PI / 2 || theta >= Math.PI * 3 / 2) ? -1 : 1); // Offset for Y based on angle
		this.thresholdY = this.renderer.height / 2 + this.renderer.height * this.SURFACE_RATE * axis.rate; // Threshold for Y position
		this.entityColor = this.renderer.context.createRadialGradient(0, 40, 0, 0, 40, 80); // Gradient for the cherry color
		this.entityColor.addColorStop(0, 'hsl(330, 70%, ' + 50 * (0.3 + axis.rate) + '%)'); // Color stops for gradient
		this.entityColor.addColorStop(0.05, 'hsl(330, 40%,' + 55 * (0.3 + axis.rate) + '%)');
		this.entityColor.addColorStop(1, 'hsl(330, 20%, ' + 70 * (0.3 + axis.rate) + '%)');
		this.shadowColor = this.renderer.context.createRadialGradient(0, 40, 0, 0, 40, 80); // Shadow gradient for the blossom
		this.shadowColor.addColorStop(0, 'hsl(330, 40%, ' + 30 * (0.3 + axis.rate) + '%)');
		this.shadowColor.addColorStop(0.05, 'hsl(330, 40%,' + 30 * (0.3 + axis.rate) + '%)');
		this.shadowColor.addColorStop(1, 'hsl(330, 20%, ' + 40 * (0.3 + axis.rate) + '%)');
	},

	// Helper function to get a random value between min and max
	getRandomValue : function(min, max){
		return min + (max - min) * Math.random();  // Return random value in the specified range
	},

	// Calculate axis properties for rendering based on current z position
	getAxis : function(){
		var rate = this.FOCUS_POSITION / (this.z + this.FOCUS_POSITION), // Rate of focus based on depth (z)
			x = this.renderer.width / 2 + this.x * rate,  // Adjust X position based on focus rate
			y = this.renderer.height / 2 - this.y * rate; // Adjust Y position based on focus rate
		return {rate : rate, x : x, y : y};  // Return calculated axis properties
	},

	// Function to render the cherry blossom shape (petals, stem, etc.)
	renderCherry : function(context, axis){
		context.beginPath();
		context.moveTo(0, 40); // Move to the starting position for the blossom
		context.bezierCurveTo(-60, 20, -10, -60, 0, -20); // Draw first petal curve
		context.bezierCurveTo(10, -60, 60, 20, 0, 40);  // Draw second petal curve
		context.fill();  // Fill the blossom

		// Draw the stem and finer petal details
		for(var i = -4; i < 4; i++){
			context.beginPath();
			context.moveTo(0, 40);
			context.quadraticCurveTo(i * 12, 10, i * 4, -24 + Math.abs(i) * 2);
			context.stroke();
		}
	},

	// Main rendering function for the cherry blossom on the canvas
	render : function(context){
		var axis = this.getAxis();  // Get the axis properties for positioning

		// Render ripple effect when the blossom reaches a certain Y position
		if(axis.y == this.thresholdY && this.rippleCount < this.MAX_RIPPLE_COUNT){
			context.save();
			context.lineWidth = 2;
			context.strokeStyle = 'hsla(0, 0%, 100%, ' + (this.MAX_RIPPLE_COUNT - this.rippleCount) / this.MAX_RIPPLE_COUNT + ')';
			context.translate(axis.x + this.offsetY * axis.rate * (this.theta <= Math.PI ? -1 : 1), axis.y);  // Adjust position for ripple
			context.scale(1, 0.3);  // Scale the ripple effect for visual elongation
			context.beginPath();
			context.arc(0, 0, this.rippleCount / this.MAX_RIPPLE_COUNT * this.RIPPLE_RADIUS * axis.rate, 0, Math.PI * 2, false);
			context.stroke();
			context.restore();
			this.rippleCount++;  // Increment ripple count
		}

		// Continue rendering the blossom if it hasn't sunk below the threshold
		if(axis.y < this.thresholdY || (!this.endTheta || !this.endPhi)){
			// Increase opacity as the blossom gets closer to the top
			if(this.y <= 0){
				this.opacity = Math.min(this.opacity + 0.01, 1);  // Fade in effect
			}
			context.save();
			context.globalAlpha = this.opacity;  // Set the opacity for the blossom
			context.fillStyle = this.shadowColor; // Set the shadow color
			context.strokeStyle = 'hsl(330, 30%,' + 40 * (0.3 + axis.rate) + '%)';  // Set stroke color
			context.translate(axis.x, Math.max(axis.y, this.thresholdY + this.thresholdY - axis.y));  // Position the blossom
			context.rotate(Math.PI - this.theta);  // Rotate the blossom
			context.scale(axis.rate * -Math.sin(this.phi), axis.rate);  // Scale based on axis rate and angle
			context.translate(0, this.offsetY);  // Translate position for visual effect
			this.renderCherry(context, axis);  // Render the cherry blossom shape
			context.restore();
		}

		// Render the actual cherry blossom entity
		context.save();
		context.fillStyle = this.entityColor; // Set the fill color for the cherry blossom
		context.strokeStyle = 'hsl(330, 40%,' + 70 * (0.3 + axis.rate) + '%)'; // Set stroke color
		context.translate(axis.x, axis.y + Math.abs(this.SINK_OFFSET * Math.sin(this.psi) * axis.rate));  // Position with sink effect
		context.rotate(this.theta);  // Rotate the blossom based on its angle
		context.scale(axis.rate * Math.sin(this.phi), axis.rate);  // Scale based on depth
		context.translate(0, this.offsetY);  // Adjust position for appearance
		this.renderCherry(context, axis);  // Render the blossom shape
		context.restore();

		// Update angles (theta, phi) and other properties based on the blossom's position
		if(this.y <= -this.renderer.height / 4){
			if(!this.endTheta){
				// Update theta (rotation angle) as the blossom rises above a certain threshold
				for(var theta = Math.PI / 2, end = Math.PI * 3 / 2; theta <= end; theta += Math.PI){
					if(this.theta < theta && this.theta + Math.PI / 200 > theta){
						this.theta = theta;
						this.endTheta = true;
						break;
					}
				}
			}
			if(!this.endPhi){
				// Update phi (another rotation angle) once certain conditions are met
				for(var phi = Math.PI / 8, end = Math.PI * 7 / 8; phi <= end; phi += Math.PI * 3 / 4){
					if(this.phi < phi && this.phi + Math.PI / 200 > phi){
						this.phi = Math.PI / 8;
						this.endPhi = true;
						break;
					}
				}
			}
		}

		// Adjust the theta angle if not yet completed
		if(!this.endTheta){
			if(axis.y == this.thresholdY){
				this.theta += Math.PI / 200 * ((this.theta < Math.PI / 2 || (this.theta >= Math.PI && this.theta < Math.PI * 3 / 2)) ? 1 : -1);
			}else{
				this.theta += Math.PI / 500;
			}
			this.theta %= Math.PI * 2; // Ensure theta stays within the 0-2PI range
		}

		// Adjust phi (rotation around the Y-axis) based on conditions
		if(this.endPhi){
			if(this.rippleCount == this.MAX_RIPPLE_COUNT){
				this.psi += this.dpsi; // Update the psi angle
				this.psi %= Math.PI * 2; // Keep psi within the 0-2PI range
			}
		}else{
			this.phi += Math.PI / ((axis.y == this.thresholdY) ? 200 : 500);  // Update phi with a certain step size
			this.phi %= Math.PI;  // Keep phi within the 0-PI range
		}

		// Reset the blossom's position and movement when it reaches the bottom of the canvas
		if(this.y <= -this.renderer.height * this.SURFACE_RATE){
			this.x += 2;
			this.y = -this.renderer.height * this.SURFACE_RATE;
		}else{
			this.x += this.vx;  // Update the X position
			this.y += this.vy;  // Update the Y position
		}

		// Return whether the cherry blossom is still within the visible area
		return this.z > -this.FOCUS_POSITION && this.z < this.FAR_LIMIT && this.x < this.renderer.width * 1.5;
	}
};

// Initialize the renderer when the DOM is ready
$(function(){
	RENDERER.init();  // Start the animation
});
