import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Admin() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'ads' | 'news'>('ads');

  // Ad form
  const [adTitle, setAdTitle] = useState('');
  const [adMedia, setAdMedia] = useState('');
  const [adPosition, setAdPosition] = useState('');
  const [adDuration, setAdDuration] = useState('');

  // News form
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [newsLanguage, setNewsLanguage] = useState('english');
  const [newsState, setNewsState] = useState('National');

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/login`, {
        password: password,
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        Alert.alert('Success', 'Login successful!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid password');
    }
  };

  const pickImage = async (type: 'ad' | 'news') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (type === 'ad') {
          setAdMedia(base64Image);
        } else {
          setNewsImage(base64Image);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreateAd = async () => {
    if (!adTitle || !adMedia || !adPosition) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/ads`, {
        title: adTitle,
        media: adMedia,
        mediaType: 'image',
        position: parseInt(adPosition),
        duration: adDuration ? parseInt(adDuration) : null,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Ad created successfully!');
        setAdTitle('');
        setAdMedia('');
        setAdPosition('');
        setAdDuration('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create ad');
    }
  };

  const handleCreateNews = async () => {
    if (!newsTitle || !newsDescription || !newsContent) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/news`, {
        title: newsTitle,
        description: newsDescription,
        content: newsContent,
        imageUrl: newsImage || null,
        language: newsLanguage,
        state: newsState,
      });

      if (response.data.success) {
        Alert.alert('Success', 'News created successfully!');
        setNewsTitle('');
        setNewsDescription('');
        setNewsContent('');
        setNewsImage('');
        setNewsLanguage('english');
        setNewsState('National');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create news');
    }
  };

  const triggerNewsFetch = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/trigger-fetch`);
      if (response.data.success) {
        Alert.alert('Success', 'News fetch triggered! Please wait a few minutes.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger news fetch');
    }
  };

  if (!isAuthenticated) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.loginContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.loginTitle}>Admin Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={triggerNewsFetch}>
          <MaterialIcons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ads' && styles.activeTab]}
          onPress={() => setActiveTab('ads')}
        >
          <Text style={[styles.tabText, activeTab === 'ads' && styles.activeTabText]}>
            Upload Ads
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'news' && styles.activeTab]}
          onPress={() => setActiveTab('news')}
        >
          <Text style={[styles.tabText, activeTab === 'news' && styles.activeTabText]}>
            Create News
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'ads' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Upload Advertisement</Text>

            <Text style={styles.label}>Ad Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter ad title"
              value={adTitle}
              onChangeText={setAdTitle}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Position Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter position (1, 2, 3...)"
              value={adPosition}
              onChangeText={setAdPosition}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Duration (seconds)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter duration (optional)"
              value={adDuration}
              onChangeText={setAdDuration}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Ad Image *</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('ad')}>
              <MaterialIcons name="add-photo-alternate" size={24} color="#DC143C" />
              <Text style={styles.imageButtonText}>Pick Image</Text>
            </TouchableOpacity>

            {adMedia && <Image source={{ uri: adMedia }} style={styles.previewImage} />}

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateAd}>
              <Text style={styles.submitButtonText}>Create Ad</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create News Article</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter news title"
              value={newsTitle}
              onChangeText={setNewsTitle}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter news description"
              value={newsDescription}
              onChangeText={setNewsDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter full news content"
              value={newsContent}
              onChangeText={setNewsContent}
              multiline
              numberOfLines={5}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Language</Text>
            <TextInput
              style={styles.input}
              placeholder="english, hindi, etc."
              value={newsLanguage}
              onChangeText={setNewsLanguage}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="National, Maharashtra, etc."
              value={newsState}
              onChangeText={setNewsState}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>News Image (Optional)</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('news')}>
              <MaterialIcons name="add-photo-alternate" size={24} color="#DC143C" />
              <Text style={styles.imageButtonText}>Pick Image</Text>
            </TouchableOpacity>

            {newsImage && <Image source={{ uri: newsImage }} style={styles.previewImage} />}

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateNews}>
              <Text style={styles.submitButtonText}>Create News</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC143C',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#DC143C',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#DC143C',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#DC143C',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#DC143C',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DC143C',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    gap: 8,
  },
  imageButtonText: {
    color: '#DC143C',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: '#DC143C',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
