import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface NewsItem {
  id: string;
  title: string;
  description: string;
  content: string;
  imageUrl?: string;
  category: string;
  state: string;
  language: string;
  isActive: boolean;
  isAdminNews?: boolean;
}

interface Ad {
  id: string;
  title: string;
  media: string;
  mediaType: string;
  position: number;
  isActive: boolean;
}

export default function Home() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedState, setSelectedState] = useState('National');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const languages = ['english', 'hindi', 'odia', 'marathi', 'bengali', 'tamil', 'telugu'];
  const states = [
    'National',
    'International',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry',
  ];

  useEffect(() => {
    fetchNews();
    fetchAds();
  }, [selectedLanguage, selectedState]);

  // Refresh news and ads when home page gains focus (e.g., returning from admin)
  useFocusEffect(
    useCallback(() => {
      fetchNews();
      fetchAds();
    }, [selectedLanguage, selectedState])
  );

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BACKEND_URL}/api/news?language=${selectedLanguage}&state=${selectedState}&limit=200`
      );
      setNews(response.data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ads`);
      setAds(response.data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    await fetchAds();
    setRefreshing(false);
  };

  // Merge news and ads: ad space appears after EVERY 3 news items (always)
  // Slot 1 = after news 1-3, Slot 2 = after news 4-6, etc.
  // If a slot has an uploaded ad, show it; otherwise show empty placeholder
  const mergeNewsWithAds = () => {
    const merged: any[] = [];

    // Build slot map: slot number -> ad
    const adsBySlot: { [key: number]: Ad } = {};
    ads.forEach((ad) => {
      adsBySlot[ad.position] = ad;
    });

    news.forEach((newsItem, index) => {
      merged.push({ type: 'news', data: newsItem });

      // After every 3 news items, ALWAYS insert an ad slot (filled or empty)
      if ((index + 1) % 3 === 0) {
        const slotNumber = (index + 1) / 3; // Slot 1, 2, 3, ...
        const adForSlot = adsBySlot[slotNumber];
        if (adForSlot) {
          merged.push({ type: 'ad', data: adForSlot, slot: slotNumber });
        } else {
          merged.push({ type: 'ad-empty', slot: slotNumber });
        }
      }
    });

    return merged;
  };

  const renderNewsCard = (newsItem: NewsItem) => (
    <TouchableOpacity
      style={[styles.newsCard, newsItem.isAdminNews && styles.adminNewsCard]}
      onPress={() => setSelectedNews(newsItem)}
      activeOpacity={0.8}
      testID={`news-card-${newsItem.id}`}
    >
      {newsItem.isAdminNews && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>EXCLUSIVE</Text>
        </View>
      )}
      {newsItem.imageUrl && (
        <Image source={{ uri: newsItem.imageUrl }} style={styles.newsImage} />
      )}
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle}>{newsItem.title}</Text>
        <Text style={styles.newsDescription} numberOfLines={3}>
          {newsItem.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAdCard = (ad: Ad) => (
    <View style={styles.adCard}>
      <Text style={styles.adLabel}>ADVERTISEMENT · Slot {ad.position}</Text>
      {ad.mediaType === 'image' && (
        <Image source={{ uri: ad.media }} style={styles.adImage} />
      )}
      <Text style={styles.adTitle}>{ad.title}</Text>
    </View>
  );

  const renderEmptyAdSlot = (slotNumber: number) => (
    <View style={styles.emptyAdCard}>
      <MaterialIcons name="campaign" size={20} color="#9CA3AF" />
      <Text style={styles.emptyAdLabel}>Ad Slot {slotNumber}</Text>
      <Text style={styles.emptyAdSub}>Available for advertisement</Text>
    </View>
  );

  const renderItem = ({ item }: any) => {
    if (item.type === 'news') {
      return renderNewsCard(item.data);
    } else if (item.type === 'ad') {
      return renderAdCard(item.data);
    } else {
      return renderEmptyAdSlot(item.slot);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Top Row: Logo + 3-dot Menu */}
        <View style={styles.headerTopRow}>
          <Text style={styles.logo}>THE BHARAT</Text>
          <TouchableOpacity
            onPress={() => router.push('/admin')}
            style={styles.menuButton}
            testID="admin-menu-button"
          >
            <MaterialIcons name="more-vert" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Row: Coin + State + Language */}
        <View style={styles.headerBottomRow}>
          {/* Coin Icon */}
          <TouchableOpacity
            onPress={() => setShowCoinModal(true)}
            style={styles.coinButton}
            testID="coin-button"
          >
            <MaterialIcons name="monetization-on" size={22} color="#FFD700" />
          </TouchableOpacity>

          {/* State Selector */}
          <TouchableOpacity
            onPress={() => setShowStateModal(true)}
            style={styles.selectorButton}
            testID="state-selector"
          >
            <Text style={styles.selectorText} numberOfLines={1}>
              {selectedState}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={18} color="#000" />
          </TouchableOpacity>

          {/* Language Selector */}
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            style={styles.selectorButton}
            testID="language-selector"
          >
            <Text style={styles.selectorText} numberOfLines={1}>
              {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* News Feed */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC143C" />
        </View>
      ) : (
        <FlatList
          data={mergeNewsWithAds()}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            if (item.type === 'news') return `news-${item.data.id}`;
            if (item.type === 'ad') return `ad-${item.data.id}-slot-${item.slot}`;
            return `ad-empty-slot-${item.slot}`;
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC143C']} />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={true}
        />
      )}

      {/* Coin Modal */}
      <Modal visible={showCoinModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCoinModal(false)}
        >
          <View style={styles.modalContent}>
            <MaterialIcons name="monetization-on" size={48} color="#FFD700" />
            <Text style={styles.modalTitle}>Recharge Reminder</Text>
            <Text style={styles.modalText}>Your mobile recharge will be in 50 days</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowCoinModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* State Selector Modal */}
      <Modal visible={showStateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {states.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.pickerItem,
                    selectedState === state && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedState(state);
                    setShowStateModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedState === state && styles.pickerItemTextSelected,
                    ]}
                  >
                    {state}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <Modal visible={showLanguageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.pickerItem,
                    selectedLanguage === lang && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedLanguage(lang);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedLanguage === lang && styles.pickerItemTextSelected,
                    ]}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* News Detail Modal */}
      <Modal visible={selectedNews !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.newsDetailModal}>
            <View style={styles.newsDetailHeader}>
              <Text style={styles.newsDetailTitle}>News Details</Text>
              <TouchableOpacity onPress={() => setSelectedNews(null)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.newsDetailScroll}>
              {selectedNews?.imageUrl && (
                <Image source={{ uri: selectedNews.imageUrl }} style={styles.newsDetailImage} />
              )}
              <Text style={styles.newsDetailTitleText}>{selectedNews?.title}</Text>
              <Text style={styles.newsDetailContent}>{selectedNews?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#DC143C',
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  menuButton: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  coinButton: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  selectorText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  adminNewsCard: {
    borderWidth: 2,
    borderColor: '#DC143C',
  },
  adminBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#DC143C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  newsImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  newsContent: {
    padding: 12,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  adCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC143C',
  },
  adLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#DC143C',
    marginBottom: 8,
  },
  adImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyAdCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  emptyAdLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  emptyAdSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#DC143C',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerItemSelected: {
    backgroundColor: '#FFE4E1',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#000',
  },
  pickerItemTextSelected: {
    color: '#DC143C',
    fontWeight: '600',
  },
  newsDetailModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '95%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  newsDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  newsDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  newsDetailScroll: {
    padding: 16,
  },
  newsDetailImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 16,
  },
  newsDetailTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  newsDetailContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});
