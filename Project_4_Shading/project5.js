// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var cx = Math.cos(rotationX);
	var sx = Math.sin(rotationX);
	var cy = Math.cos(rotationY);
	var sy = Math.sin(rotationY);

	// rotY * rotX
	var rotY_rotX = [
		cy,         sx*sy,        -cx*sy,      0,
		0,          cx,            sx,         0,
		sy,        -sx*cy,         cx*cy,      0,
		0,           0,             0,         1
	];

	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// translation and rotation
	var mv = MatrixMult(trans, rotY_rotX);
	return mv;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations
		this.program = InitShaderProgram(Vs, Fs);

		this.mvpUniform = gl.getUniformLocation(this.program, "u_mvpMatrix");
		this.mvUniform = gl.getUniformLocation(this.program, "u_mvMatrix");
		this.normalMatrixUniform = gl.getUniformLocation(this.program, "u_normalMatrix");

		this.u_Texture = gl.getUniformLocation(this.program, "u_useTexture");

		//buffers
		this.vertexBuffer = gl.createBuffer(); 
		this.texCoordBuffer = gl.createBuffer(); 
		this.normalBuffer = gl.createBuffer(); 
		
		this.swapYZUniform = gl.getUniformLocation(this.program, "u_swapAxes");

		//light
		this.lightDirUniform = gl.getUniformLocation(this.program, "u_lightDirection");
		this.shininessUniform = gl.getUniformLocation(this.program, "u_shininess");

		this.sampler = gl.getUniformLocation(this.program, "u_texture");

		this.vertexPosition = gl.getAttribLocation(this.program, "a_position");
		this.texCoord = gl.getAttribLocation(this.program, "a_texCoord");
		this.vertexNormal = gl.getAttribLocation(this.program, "a_normal");
		
		this.u_Texture = gl.getUniformLocation(this.program, "u_useTexture");
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;

		// vertex buffer
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW );

		// texture coordinate buffer
		gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoordBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW );

		// normal buffer 
		gl.bindBuffer( gl.ARRAY_BUFFER, this.normalBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW );
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		gl.useProgram(this.program);
		gl.uniform1i(this.swapYZUniform, swap ? 1 : 0);
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram( this.program );
		gl.uniformMatrix4fv(this.mvpUniform, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvUniform, false, matrixMV);
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, matrixNormal);

		// Vertex 
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );		
		gl.vertexAttribPointer(this.vertexPosition, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertexPosition );

		// texture coord
		gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoordBuffer );
		gl.vertexAttribPointer(this.texCoord, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoord );

		// norm 
		gl.bindBuffer( gl.ARRAY_BUFFER, this.normalBuffer );
		gl.vertexAttribPointer(this.vertexNormal, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertexNormal );

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
		this.texture = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, this.texture );
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		
		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		gl.useProgram(this.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.uniform1i(this.u_Texture, true);
		gl.uniform1i(this.sampler, 0);
		gl.uniform1f(this.shininessUniform, 1.0);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.program);
		gl.uniform1i(this.u_Texture, show);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
		let lightDir = new Float32Array([x,y,z]);
		gl.useProgram(this.program);
		gl.uniform3fv(this.lightDirUniform, lightDir);
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		this.shininess = shininess;
		gl.useProgram(this.program);
		gl.uniform1f(this.shininessUniform, shininess);
	}
}

// Vertex Shader
var Vs = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texCoord;

    uniform mat4 u_mvpMatrix;
    uniform mat4 u_mvMatrix;
    uniform mat3 u_normalMatrix;
    uniform bool u_swapAxes;

    varying vec2 v_uv;
    varying vec3 v_viewPos;
    varying vec3 v_transformedNormal;

    void main() {
        vec3 pos = a_position;
        vec3 norm = a_normal;

        if(u_swapAxes) {
            float tmp = pos.y;
            pos.y = pos.z;
            pos.z = tmp;

            tmp = norm.y;
            norm.y = norm.z;
            norm.z = tmp;
        }

        v_viewPos = (u_mvMatrix * vec4(pos, 1.0)).xyz;
        v_transformedNormal = normalize(u_normalMatrix * norm);
        v_uv = a_texCoord;

        gl_Position = u_mvpMatrix * vec4(pos, 1.0);
    }
`;

// Fragment Shader
var Fs = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform bool u_useTexture;
    uniform float u_shininess;
    uniform vec3 u_lightDirection;

    varying vec2 v_uv;
    varying vec3 v_viewPos;
    varying vec3 v_transformedNormal;

    void main() {
        vec3 baseColor = vec3(1.0);
        float alpha = 1.0;

        if(u_useTexture) {
            vec4 texSample = texture2D(u_texture, v_uv);
            baseColor = texSample.rgb;
            alpha = texSample.a;
        }

        vec3 norm = normalize(v_transformedNormal);
        vec3 lightDir = normalize(u_lightDirection);
        vec3 viewDir = normalize(-v_viewPos);

        float diff = max(dot(norm, lightDir), 0.0);

        vec3 halfway = normalize(lightDir + viewDir);
        float spec = pow(max(dot(norm, halfway), 0.0), u_shininess);

        vec3 ambient = 0.1 * baseColor;
        vec3 diffuse = diff * baseColor;
        vec3 specular = spec * vec3(1.0);

        vec3 color = ambient + diffuse + specular;

        gl_FragColor = vec4(color, alpha);
    }
`;