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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Cross-platform alert that works on web AND native
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function Admin() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'ads' | 'news' | 'manage'>('ads');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manage content lists
  const [manageNewsList, setManageNewsList] = useState<any[]>([]);
  const [manageAdsList, setManageAdsList] = useState<any[]>([]);
  const [manageSubTab, setManageSubTab] = useState<'news' | 'ads'>('news');

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

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleLogin = async () => {
    if (!password) {
      showStatus('error', 'Please enter password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/login`, {
        password: password,
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        showStatus('success', 'Login successful!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showStatus('error', error.response?.data?.detail || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  // Cross-platform image picker
  const pickImageWeb = (type: 'ad' | 'news') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Image = reader.result as string;
          if (type === 'ad') {
            setAdMedia(base64Image);
          } else {
            setNewsImage(base64Image);
          }
          showStatus('success', 'Image uploaded!');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const pickImage = async (type: 'ad' | 'news') => {
    // Use web file input for web platform
    if (Platform.OS === 'web') {
      pickImageWeb(type);
      return;
    }

    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showStatus('error', 'Permission to access photos denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        showStatus('success', 'Image uploaded!');
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      showStatus('error', 'Failed to pick image: ' + error.message);
    }
  };

  const handleCreateAd = async () => {
    if (!adTitle || !adMedia || !adPosition) {
      showStatus('error', 'Please fill: Title, Position & Image');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/ads`, {
        title: adTitle,
        media: adMedia,
        mediaType: 'image',
        position: parseInt(adPosition),
        duration: adDuration ? parseInt(adDuration) : null,
      });

      if (response.data.success) {
        showStatus('success', `Ad created at position ${adPosition}!`);
        setAdTitle('');
        setAdMedia('');
        setAdPosition('');
        setAdDuration('');
      }
    } catch (error: any) {
      console.error('Create ad error:', error);
      showStatus('error', error.response?.data?.detail || 'Failed to create ad');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNews = async () => {
    if (!newsTitle || !newsDescription || !newsContent) {
      showStatus('error', 'Please fill Title, Description & Content');
      return;
    }

    setLoading(true);
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
        showStatus('success', 'News created! It will appear on top of feed.');
        setNewsTitle('');
        setNewsDescription('');
        setNewsContent('');
        setNewsImage('');
      }
    } catch (error: any) {
      console.error('Create news error:', error);
      showStatus('error', error.response?.data?.detail || 'Failed to create news');
    } finally {
      setLoading(false);
    }
  };

  const triggerNewsFetch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/trigger-fetch`);
      if (response.data.success) {
        showStatus('success', 'News fetch triggered! Wait a few minutes.');
      }
    } catch (error) {
      showStatus('error', 'Failed to trigger news fetch');
    } finally {
      setLoading(false);
    }
  };

  const loadManageData = async () => {
    setLoading(true);
    try {
      const [newsRes, adsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/news/list`),
        axios.get(`${BACKEND_URL}/api/admin/ads/list`),
      ]);
      setManageNewsList(newsRes.data.news || []);
      setManageAdsList(adsRes.data.ads || []);
    } catch (error: any) {
      showStatus('error', 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(message));
      } else {
        Alert.alert('Confirm Delete', message, [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
        ]);
      }
    });
  };

  const deleteNewsItem = async (id: string, title: string) => {
    const ok = await confirmDelete(`Delete news: "${title}"?`);
    if (!ok) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/admin/news/${id}`);
      showStatus('success', 'News deleted!');
      setManageNewsList((prev) => prev.filter((n) => n.id !== id));
    } catch (error: any) {
      showStatus('error', 'Failed to delete news');
    }
  };

  const deleteAdItem = async (id: string, title: string) => {
    const ok = await confirmDelete(`Delete ad: "${title}"?`);
    if (!ok) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/admin/ads/${id}`);
      showStatus('success', 'Ad deleted!');
      setManageAdsList((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      showStatus('error', 'Failed to delete ad');
    }
  };

  if (!isAuthenticated) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.loginContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} testID="close-login">
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <MaterialIcons name="admin-panel-settings" size={64} color="#DC143C" />
          <Text style={styles.loginTitle}>Admin Login</Text>
          <Text style={styles.loginSubtitle}>Enter password to manage news & ads</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#999"
            testID="password-input"
            onSubmitEditing={handleLogin}
          />

          {statusMessage && (
            <View style={[styles.statusBanner, statusMessage.type === 'error' ? styles.errorBanner : styles.successBanner]}>
              <Text style={styles.statusText}>{statusMessage.text}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
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
        <TouchableOpacity onPress={() => router.back()} testID="back-button">
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={triggerNewsFetch} testID="refresh-button">
          <MaterialIcons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {statusMessage && (
        <View style={[styles.statusBanner, statusMessage.type === 'error' ? styles.errorBanner : styles.successBanner]}>
          <MaterialIcons 
            name={statusMessage.type === 'success' ? 'check-circle' : 'error'} 
            size={20} 
            color="#FFF" 
          />
          <Text style={styles.statusText}>{statusMessage.text}</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ads' && styles.activeTab]}
          onPress={() => setActiveTab('ads')}
          testID="ads-tab"
        >
          <MaterialIcons name="campaign" size={18} color={activeTab === 'ads' ? '#DC143C' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'ads' && styles.activeTabText]}>
            Ads
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'news' && styles.activeTab]}
          onPress={() => setActiveTab('news')}
          testID="news-tab"
        >
          <MaterialIcons name="article" size={18} color={activeTab === 'news' ? '#DC143C' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'news' && styles.activeTabText]}>
            News
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => {
            setActiveTab('manage');
            loadManageData();
          }}
          testID="manage-tab"
        >
          <MaterialIcons name="settings" size={18} color={activeTab === 'manage' ? '#DC143C' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>
            Manage
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {activeTab === 'ads' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Upload Advertisement</Text>
            <Text style={styles.formSubtitle}>Each ad shows only in its assigned slot</Text>

            <Text style={styles.label}>Ad Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter ad title"
              value={adTitle}
              onChangeText={setAdTitle}
              placeholderTextColor="#999"
              testID="ad-title-input"
            />

            <Text style={styles.label}>Slot Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1 = after 1st 3 news, 2 = after next 3..."
              value={adPosition}
              onChangeText={setAdPosition}
              keyboardType="numeric"
              placeholderTextColor="#999"
              testID="ad-position-input"
            />
            <Text style={styles.helperText}>Slot 1 → after news 1-3 · Slot 2 → after news 4-6 · etc.</Text>

            <Text style={styles.label}>Duration in seconds (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3600 for 1 hour"
              value={adDuration}
              onChangeText={setAdDuration}
              keyboardType="numeric"
              placeholderTextColor="#999"
              testID="ad-duration-input"
            />

            <Text style={styles.label}>Ad Image *</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('ad')} testID="pick-ad-image">
              <MaterialIcons name="add-photo-alternate" size={24} color="#DC143C" />
              <Text style={styles.imageButtonText}>{adMedia ? 'Change Image' : 'Pick Image'}</Text>
            </TouchableOpacity>

            {adMedia ? <Image source={{ uri: adMedia }} style={styles.previewImage} /> : null}

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleCreateAd}
              disabled={loading}
              testID="submit-ad-button"
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Ad</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'news' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create News Article</Text>
            <Text style={styles.formSubtitle}>Admin news appears on top of the feed</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter news title"
              value={newsTitle}
              onChangeText={setNewsTitle}
              placeholderTextColor="#999"
              testID="news-title-input"
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
              testID="news-description-input"
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
              testID="news-content-input"
            />

            <Text style={styles.label}>Language</Text>
            <TextInput
              style={styles.input}
              placeholder="english, hindi, etc."
              value={newsLanguage}
              onChangeText={setNewsLanguage}
              placeholderTextColor="#999"
              testID="news-language-input"
            />

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="National, Maharashtra, etc."
              value={newsState}
              onChangeText={setNewsState}
              placeholderTextColor="#999"
              testID="news-state-input"
            />

            <Text style={styles.label}>News Image (Optional)</Text>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('news')} testID="pick-news-image">
              <MaterialIcons name="add-photo-alternate" size={24} color="#DC143C" />
              <Text style={styles.imageButtonText}>{newsImage ? 'Change Image' : 'Pick Image'}</Text>
            </TouchableOpacity>

            {newsImage ? <Image source={{ uri: newsImage }} style={styles.previewImage} /> : null}

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleCreateNews}
              disabled={loading}
              testID="submit-news-button"
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create News</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'manage' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Manage Content</Text>
            <Text style={styles.formSubtitle}>Delete news articles and ads</Text>

            {/* Sub-tabs */}
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                style={[styles.subTab, manageSubTab === 'news' && styles.subTabActive]}
                onPress={() => setManageSubTab('news')}
                testID="manage-news-subtab"
              >
                <Text style={[styles.subTabText, manageSubTab === 'news' && styles.subTabTextActive]}>
                  News ({manageNewsList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, manageSubTab === 'ads' && styles.subTabActive]}
                onPress={() => setManageSubTab('ads')}
                testID="manage-ads-subtab"
              >
                <Text style={[styles.subTabText, manageSubTab === 'ads' && styles.subTabTextActive]}>
                  Ads ({manageAdsList.length})
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.refreshLink} onPress={loadManageData} testID="reload-manage">
              <MaterialIcons name="refresh" size={18} color="#DC143C" />
              <Text style={styles.refreshLinkText}>Reload</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color="#DC143C" style={{ marginTop: 16 }} />}

            {/* News List */}
            {manageSubTab === 'news' && (
              <View style={{ marginTop: 8 }}>
                {manageNewsList.length === 0 && !loading && (
                  <Text style={styles.emptyText}>No news available</Text>
                )}
                {manageNewsList.map((item) => (
                  <View key={item.id} style={styles.manageItem} testID={`manage-news-${item.id}`}>
                    <View style={styles.manageItemContent}>
                      {item.isAdminNews && (
                        <View style={styles.adminTag}>
                          <Text style={styles.adminTagText}>ADMIN</Text>
                        </View>
                      )}
                      <Text style={styles.manageItemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.manageItemMeta}>
                        {item.language} · {item.state}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteNewsItem(item.id, item.title)}
                      testID={`delete-news-${item.id}`}
                    >
                      <MaterialIcons name="delete" size={22} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Ads List */}
            {manageSubTab === 'ads' && (
              <View style={{ marginTop: 8 }}>
                {manageAdsList.length === 0 && !loading && (
                  <Text style={styles.emptyText}>No ads uploaded yet</Text>
                )}
                {manageAdsList.map((item) => (
                  <View key={item.id} style={styles.manageItem} testID={`manage-ad-${item.id}`}>
                    <View style={styles.manageItemContent}>
                      <View style={styles.slotTag}>
                        <Text style={styles.slotTagText}>SLOT {item.position}</Text>
                      </View>
                      <Text style={styles.manageItemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.manageItemMeta}>
                        Type: {item.mediaType}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteAdItem(item.id, item.title)}
                      testID={`delete-ad-${item.id}`}
                    >
                      <MaterialIcons name="delete" size={22} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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
    padding: 8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC143C',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#DC143C',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  successBanner: {
    backgroundColor: '#10B981',
  },
  errorBanner: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#DC143C',
  },
  tabText: {
    fontSize: 15,
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
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
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
    backgroundColor: '#FFF',
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
  helperText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginTop: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabActive: {
    backgroundColor: '#DC143C',
  },
  subTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#FFF',
  },
  refreshLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 4,
  },
  refreshLinkText: {
    color: '#DC143C',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 24,
  },
  manageItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manageItemContent: {
    flex: 1,
    paddingRight: 12,
  },
  manageItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  manageItemMeta: {
    fontSize: 12,
    color: '#666',
  },
  adminTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC143C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 4,
  },
  adminTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  slotTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 4,
  },
  slotTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
