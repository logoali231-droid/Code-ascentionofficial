module.exports = {
  type: 'docker',
  limits: { memory: '1024m', cpus: '1.0' },
  buildCommand: (code) => `java Main.java <<< "${code.replace(/"/g, '\\"')}"`
};
