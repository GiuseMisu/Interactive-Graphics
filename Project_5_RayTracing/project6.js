var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		// TO-DO: Check for shadows
		vec3 toLight = lights[i].position - position;
		float distToLight = length(toLight);
		vec3 lightDir = normalize(toLight);

		Ray shadowRay;
		shadowRay.pos = position;
		shadowRay.dir = lightDir;

		HitInfo shadowHit;
		bool shadowed = false;
		if (IntersectRay(shadowHit, shadowRay)) {
			// Only shadow if the hit is closer than the light
			if (shadowHit.t > 0.0 && shadowHit.t < distToLight) {
				shadowed = true;
			}
		}

		// TO-DO: If not shadowed, perform shading using the Blinn model
		if (!shadowed) {
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 halfVec = normalize(lightDir + view);
            float spec = 0.0;
            if (diff > 0.0) {
                spec = pow(max(dot(normal, halfVec), 0.0), mtl.n);
            }
            vec3 diffuse = diff * mtl.k_d;
            vec3 specular = spec * mtl.k_s;
            color += (diffuse + specular) * lights[i].intensity;
        }
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30;
    bool foundHit = false;
    for (int idx = 0; idx < NUM_SPHERES; ++idx) {
		// TO-DO: Test for ray-sphere intersection
        vec3 center = spheres[idx].center;
        float radius = spheres[idx].radius;

        vec3 originToCenter = ray.pos - center;
        float dirDot = dot(ray.dir, ray.dir);
        float proj = dot(ray.dir, originToCenter);
        float distSq = dot(originToCenter, originToCenter) - (radius * radius);

        float discriminant = proj * proj - dirDot * distSq;

		// TO-DO: If intersection is found, update the given HitInfo
        if (discriminant >= 0.0) {
            float root = sqrt(discriminant);
            float tA = (-proj - root) / dirDot;
            float tB = (-proj + root) / dirDot;
            float tClosest = min(tA, tB);
			
            if (tClosest > 2e-4 && tClosest < hit.t) {
                foundHit = true;
                hit.t = tClosest;
                hit.position = ray.pos + tClosest * ray.dir;
                hit.normal = normalize(hit.position - center);
                hit.mtl = spheres[idx].mtl;
            }
        }
		else {
			// No intersection
			continue;
		}
    }
    return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
    HitInfo hit;
    if ( IntersectRay( hit, ray ) ) {
        vec3 view = normalize( -ray.dir );
        vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
        
        // Compute reflections
        vec3 k_s = hit.mtl.k_s;
        for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
            if ( bounce >= bounceLimit ) break;
            if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
            
            Ray r;   // this is the reflection ray
            HitInfo h;   // reflection hit info
            
            // TO-DO: Initialize the reflection ray
            r.pos = hit.position;
            r.dir = reflect(-view, hit.normal);
            
            if ( IntersectRay( h, r ) ) {
                // TO-DO: Hit found, so shade the hit point
                clr += k_s * Shade(h.mtl, h.position, h.normal, view);
                // TO-DO: Update the loop variables for tracing the next reflection ray
                view = normalize(-r.dir);
                k_s *= h.mtl.k_s;
                hit = h;
            } else {
                // The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
            }
        }
        return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;