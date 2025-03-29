/**
 * Computes a 3x3 transformation matrix in column-major order.
 * 
 * This function generates a transformation matrix that first scales, then rotates, 
 * and finally translates a point in 2D space. The rotation is specified in degrees.
 * 
 * @param {number} positionX - The translation along the x-axis.
 * @param {number} positionY - The translation along the y-axis.
 * @param {number} rotation  - The rotation angle in degrees.
 * @param {number} scale     - The scaling factor applied before rotation.
 * @returns {number[]} A 3x3 transformation matrix as an array of 9 values in column-major order.
 */

function GetTransform( positionX, positionY, rotation, scale ){
	let to_ret = new Array(9);

	to_ret[0] = scale * Math.cos(rotation * Math.PI / 180); // convert to radians
	to_ret[1] = scale * Math.sin(rotation * Math.PI / 180); // convert to radians

	to_ret[2] = 0; 
	to_ret[5] = 0;

	to_ret[3] = -scale * Math.sin(rotation * Math.PI / 180); // convert to radians
	to_ret[4] = scale * Math.cos(rotation * Math.PI / 180);  // convert to radians
	
	to_ret[6] = positionX; // translation in x direction
	to_ret[7] = positionY; // translation in y direction

	to_ret[8] = 1; // homogeneous coordinate

	return to_ret;
}


/**
 * Multiplies two 3x3 transformation matrices in column-major order.
 * 
 * This function computes the product of two transformation matrices, applying 
 * `trans1` first and then `trans2`. The result is a new transformation matrix 
 * that combines both transformations.
 * 
 * @param {number[]} trans1 - The first transformation matrix.
 * @param {number[]} trans2 - The second transformation matrix.
 * @returns {number[]} The resulting 3x3 transformation matrix as an array of 9 values in column-major order.
 */

function ApplyTransform( trans1, trans2 ){
	to_ret = new Array(9);
	for (let i = 0; i < 3; i++){
		for (let j = 0; j < 3; j++){
			let a = trans1[i* 3] * trans2[j];
			let b = trans1[i * 3 + 1] * trans2[j + 3];
			let c = trans1[i * 3 + 2] * trans2[j + 6];
			to_ret[i * 3 + j] = a + b + c;
		}
	}
	return to_ret;
}


