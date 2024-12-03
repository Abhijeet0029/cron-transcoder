<template>
  <div id="app">
    <h1>Video File Upload</h1>
    <form @submit.prevent="handleUpload">
      <div>
        <label for="videoFile">Choose Video File:</label>
        <input type="file" id="videoFile" @change="onFileSelect" />
      </div>
      <div v-if="file">
        <p><strong>Selected File:</strong> {{ file.name }}</p>
      </div>
      <button type="submit" :disabled="!file">Upload</button>
    </form>
    <div v-if="uploading">Uploading...</div>
    <div v-if="uploadSuccess" class="success">
      File uploaded successfully! <br />
      <strong>URL:</strong> <a :href="dashManifestUrl" target="_blank">{{ dashManifestUrl }}</a>
    </div>
    <div v-if="uploadError" class="error">
      Error: {{ uploadError }}
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      file: null,
      uploading: false,
      uploadSuccess: false,
      uploadError: null,
      dashManifestUrl: '',
    };
  },
  methods: {
    onFileSelect(event) {
      this.file = event.target.files[0];
    },
    async handleUpload() {
      if (!this.file) {
        this.uploadError = 'No file selected.';
        return;
      }

      this.uploading = true;
      this.uploadSuccess = false;
      this.uploadError = null;

      try {
        const formData = new FormData();
        formData.append('video', this.file);

        const response = await axios.post('http://localhost:5001/api/videos/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && response.data.video) {
          this.dashManifestUrl = response.data.video.dashManifest.replace('./', 'http://localhost:5001/');
          this.uploadSuccess = true;
        }
      } catch (error) {
        console.log('error from frontend catch: ', error);
        this.uploadError = error.response?.data?.message || 'An error occurred during upload from frontend catch block.';
      } finally {
        this.uploading = false;
      }
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 50px;
}

form {
  margin-bottom: 20px;
}

.success {
  color: green;
}

.error {
  color: red;
}
</style>
