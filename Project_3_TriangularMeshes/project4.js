// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY ){
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	var rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), -Math.sin(rotationX), 0,
		0, Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	var rotY = [
		Math.cos(rotationY), 0, Math.sin(rotationY), 0,
		0, 1, 0, 0,
		-Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];

	let rot = MatrixMult( rotY, rotX );
	let rotation_translation = MatrixMult(trans, rot );
	var mvp = MatrixMult( projectionMatrix, rotation_translation );
	return mvp; 
}


// [TO-DO] Complete the implementation of the following class.
class MeshDrawer {
	//responsible for rendering the triangular mesh 

	constructor(){
		// [TO-DO] initializations
		this.shaderProgram = InitShaderProgram(vs, fs); //compile and link the shaders
		if (this.shaderProgram == null) {
			alert("Error in shader program initialization.");
			return;
		}
		console.log("Shader program init");

		this.mvpUniform = gl.getUniformLocation(this.shaderProgram, "uModelViewProjection");	
		this.vertPositionAttrib = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
		this.texCoordAttrib = gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
		this.swapYZUniform = gl.getUniformLocation(this.shaderProgram, "uSwapYZ"); 

		//buffers for vertex positions and texture coordinates
		this.vertexBuffer = gl.createBuffer(); //vertex pos
		this.texCoordBuffer = gl.createBuffer(); //texture coord

		this.numTriangles = 0;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords ){

		// [TO-DO] Update the contents of the vertex buffer objects.
	
		this.numTriangles = vertPos.length / 3;
        console.log("Number of triangles:", this.numTriangles);

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		// Upload the vertex position data to the GPU.
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW );
		
		gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoordBuffer );
		// Upload the texture coordinate data to the GPU.
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW );

		//unbind the buffers
		gl.bindBuffer( gl.ARRAY_BUFFER, null );

	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap ){
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		// If swap is true, set the uniform to 1 (true), otherwise set it to 0 (false).
    
		console.log("Swapping Y and Z axes:", swap);
        gl.useProgram(this.shaderProgram);
        gl.uniform1i(this.swapYZUniform, swap ? 1 : 0);
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans ){
		// [TO-DO] Complete the WebGL initializations before drawing

		gl.useProgram( this.shaderProgram );

        gl.uniformMatrix4fv(this.mvpUniform, false, trans);

		// Bind and enable the vertex buffer.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.vertPositionAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertPositionAttrib);
	
		// Bind and enable the texture coordinate buffer.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.texCoordAttrib);
	
		// Draw the triangles.
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles * 3); // 3 vertices per triangle
		console.log("Mesh drawn.");
	
		// Disable the vertex attributes.
		gl.disableVertexAttribArray(this.vertPositionAttrib);
		gl.disableVertexAttribArray(this.texCoordAttrib);
	
		// Unbind buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, null);		
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img ){
		// [TO-DO] Bind the texture

		if (!this.texture) {
			this.texture = gl.createTexture();
		}

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

		 // Generate mipmaps for the texture.
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		console.log("Texture parameters set.");
	 	
		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
	
		gl.useProgram(this.shaderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(gl.getUniformLocation(this.shaderProgram, "uSampler"), 0); // Set the texture unit to 0

		// Initialize the uShowTexture uniform to true
		gl.uniform1i(gl.getUniformLocation(this.shaderProgram, "uShowTexture"), 1);
	}

	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		if (show) {
			console.log("Showing texture.");
			gl.useProgram(this.shaderProgram);
			gl.uniform1i(gl.getUniformLocation(this.shaderProgram, "uShowTexture"), 1); // (true)
		}
		else {
			console.log("Not showing texture.");
			gl.useProgram(this.shaderProgram);
			gl.uniform1i(gl.getUniformLocation(this.shaderProgram, "uShowTexture"), 0); // (false)
		}

	}
	
}	

// Vertex shader GLSL code
const vs = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uModelViewProjection;
uniform bool uSwapYZ;

varying vec2 vTextureCoord;

void main() {
    vec3 position = aVertexPosition;

    if (uSwapYZ) {
        position = vec3(position.x, position.z, position.y);
    }

    gl_Position = uModelViewProjection * vec4(position, 1.0);
    vTextureCoord = aTextureCoord;
}
`;

// Fragment shader GLSL code
const fs = `
precision mediump float;

varying vec2 vTextureCoord;

uniform bool uShowTexture;
uniform sampler2D uSampler;

void main() {
    if (uShowTexture) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
    } else {
        gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0);
    }
}
`;