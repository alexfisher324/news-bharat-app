import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { Video, ResizeMode } from 'expo-av';
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

interface VideoReel {
  id: string;
  title: string;
  description: string;
  duration: string;
  state: string;
  videoUrl?: string;
  thumbnail?: string;
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
  const [activeTab, setActiveTab] = useState<'video' | 'article'>('video');
  const [videoReels, setVideoReels] = useState<VideoReel[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoLoadingMap, setVideoLoadingMap] = useState<{ [id: string]: boolean }>({});
  const [showPlaybackControls, setShowPlaybackControls] = useState(false);
  const [videoListHeight, setVideoListHeight] = useState(0);
  const [isFetchingShorts, setIsFetchingShorts] = useState(false);
  const videoRefs = useRef<any[]>([]);
  const playbackControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const visibleIndex = viewableItems[0]?.index ?? 0;
    setCurrentVideoIndex(visibleIndex);
  });
  const scrollOpacity = useRef(new Animated.Value(1)).current;

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

  const dummyVideoReels: VideoReel[] = [
    {
      id: '1',
      title: 'Forest River & Sunlight Serenity',
      description: 'These exclusive highlights support up to 50 active uploads. Please swipe vertically (bottom to top) to load next reels, or ...',
      duration: '1 Min Highlights',
      state: 'All States',
      thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=800&fit=crop',
    },
    {
      id: '2',
      title: 'Breaking News: India vs Afghanistan Test',
      description: 'KL Rahul and Sai Sudharsan steady batting steers India to 9... Live coverage of the latest cricket highlights and breaking news.',
      duration: '2 Min Highlights',
      state: 'National',
      thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=800&fit=crop',
    },
    {
      id: '3',
      title: 'Weather Update: Monsoon Approaching',
      description: 'IMD issues alert for heavy rainfall in Eastern regions. Prepare for the upcoming monsoon season with our latest weather report.',
      duration: '1 Min Update',
      state: 'All States',
      thumbnail: 'https://images.unsplash.com/photo-1534274988757-a28bf1a4c817?w=600&h=800&fit=crop',
    },
    {
      id: '4',
      title: 'Tech Innovation Summit 2026',
      description: 'Leading tech companies showcase latest innovations at the annual tech summit. Discover cutting-edge technologies and startups.',
      duration: '3 Min Highlights',
      state: 'National',
      thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=800&fit=crop',
    },
  ];

  useEffect(() => {
    fetchNews();
    fetchAds();
    fetchShorts();
  }, [selectedLanguage, selectedState]);

  // Refresh news, ads, and shorts when home page gains focus (e.g., returning from admin)
  useFocusEffect(
    useCallback(() => {
      fetchNews();
      fetchAds();
      fetchShorts();
    }, [selectedLanguage, selectedState])
  );

  const fetchNews = async () => {
    try {
      setLoading(true);
      const capitalizedLanguage = selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1);
      const response = await axios.get(
        `${BACKEND_URL}/api/news?language=${capitalizedLanguage}&state=${selectedState}&limit=200`
      );
      console.log('API URL:', `language=${capitalizedLanguage}&state=${selectedState}&limit=200`);
      console.log('Fetched news:', response.data.news);
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

  const fetchShorts = async () => {
    try {
      setIsFetchingShorts(true);
      const response = await axios.get(`${BACKEND_URL}/api/shorts?limit=20`);
      const fetchedShorts = (response.data.shorts || []).map((short: any, index: number) => ({
        id: short.id || `short-${index}`,
        title: short.title || 'Video Highlight',
        description: short.description || '',
        duration: short.duration || 'Short Highlight',
        state: short.state || 'National',
        videoUrl: short.videoUrl || '',
        thumbnail: short.thumbnail || undefined,
      }));
      if (fetchedShorts.length > 0) {
        setVideoReels(fetchedShorts);
      } else {
        setVideoReels(dummyVideoReels);
      }
    } catch (error) {
      console.error('Error fetching shorts:', error);
      setVideoReels(dummyVideoReels);
    } finally {
      setIsFetchingShorts(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    await fetchAds();
    await fetchShorts();
    setRefreshing(false);
  };

  const showPlaybackControlsTemporarily = (visible = true) => {
    setShowPlaybackControls(visible);
    if (playbackControlsTimer.current) {
      clearTimeout(playbackControlsTimer.current);
    }
    playbackControlsTimer.current = setTimeout(() => {
      setShowPlaybackControls(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (playbackControlsTimer.current) {
        clearTimeout(playbackControlsTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((videoRef, idx) => {
      if (!videoRef || typeof videoRef.pauseAsync !== 'function') {
        return;
      }
      if (idx === currentVideoIndex) {
        if (isVideoPlaying) {
          videoRef.playAsync().catch(() => {});
        } else {
          videoRef.pauseAsync().catch(() => {});
        }
      } else {
        videoRef.pauseAsync().catch(() => {});
      }
    });
  }, [currentVideoIndex, isVideoPlaying]);

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
          <Text style={styles.logo}>The BHARAT Evolution</Text>
           {/* Bottom Row: Coin Icon (visible on Video tab) */}
       
          <View style={styles.headerBottomRow}>
            <TouchableOpacity
              onPress={() => setShowCoinModal(true)}
              style={styles.coinButton}
              testID="coin-button"
            >
              <MaterialIcons name="monetization-on" size={22} color="#FFD700" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/admin')}
            style={styles.menuButton}
            testID="admin-menu-button"
          >
            <MaterialIcons name="more-vert" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'video' && styles.tabButtonActive]}
            onPress={() => setActiveTab('video')}
          >
            <MaterialIcons name="play-circle-fill" size={20} color={activeTab === 'video' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, activeTab === 'video' && styles.tabLabelActive]}>
              VIDEO HIGHLIGHTS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'article' && styles.tabButtonActive]}
            onPress={() => setActiveTab('article')}
          >
            <MaterialIcons name="newspaper" size={20} color={activeTab === 'article' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, activeTab === 'article' && styles.tabLabelActive]}>
              E-PAPER ARTICLES
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Content Area - Tab Based */}
      {activeTab === 'video' ? (
        // VIDEO HIGHLIGHTS TAB - Full Screen Reel View
        <View
          style={styles.videoReelsContainer}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            if (height && height !== videoListHeight) {
              setVideoListHeight(height);
            }
          }}
        >
          <FlatList
            data={videoReels}
            pagingEnabled
            snapToAlignment="start"
            decelerationRate="fast"
            snapToInterval={videoListHeight || undefined}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={false}
            onScrollBeginDrag={() => {
              Animated.timing(scrollOpacity, {
                toValue: 0.75,
                duration: 120,
                useNativeDriver: true,
              }).start();
              setShowPlaybackControls(false);
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#DC143C"
                colors={['#DC143C']}
              />
            }
            onMomentumScrollEnd={(event) => {
              Animated.timing(scrollOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
              }).start();
              const contentOffsetY = event.nativeEvent.contentOffset.y;
              const newIndex = Math.round(contentOffsetY / event.nativeEvent.layoutMeasurement.height);
              setCurrentVideoIndex(newIndex);
              setShowPlaybackControls(false);
            }}
            renderItem={({ item, index }) => (
              <Pressable
                style={[styles.reelFullScreen, videoListHeight ? { height: videoListHeight } : {}]}
                onPress={() => {
                  setIsVideoPlaying((prev) => !prev);
                  showPlaybackControlsTemporarily(true);
                }}
              >
                {/* Video background with preloaded next reels */}
                {item.videoUrl ? (
                  <Video
                    ref={(ref) => {
                      videoRefs.current[index] = ref;
                    }}
                    source={{ uri: item.videoUrl }}
                    style={styles.videoBackground}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={index === currentVideoIndex && isVideoPlaying}
                    isLooping
                    useNativeControls={false}
                    posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
                    onLoadStart={() => {
                      setVideoLoadingMap((prev) => ({ ...prev, [item.id]: true }));
                    }}
                    onReadyForDisplay={() => {
                      setVideoLoadingMap((prev) => ({ ...prev, [item.id]: false }));
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      // Narrow the union type: AVPlaybackStatus may be an error object
                      if (status && 'isLoaded' in status) {
                        if (status.isLoaded) {
                          const loaded: any = status;
                          setVideoLoadingMap((prev) => ({ ...prev, [item.id]: !!loaded.isBuffering }));
                        } else {
                          setVideoLoadingMap((prev) => ({ ...prev, [item.id]: false }));
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error('Video playback error:', error);
                      setVideoLoadingMap((prev) => ({ ...prev, [item.id]: false }));
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.videoBackground}
                  />
                )}

                {/* Loading indicator while this video's loading/buffering */}
                {item.videoUrl && videoLoadingMap[item.id] && (
                  <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingSpinner} />
                  </View>
                )}

                {/* Dark Overlay for Transparency */}
                <View style={styles.videoOverlay} />

                {item.videoUrl && showPlaybackControls && (
                  <View style={styles.playButtonOverlay}>
                    <MaterialIcons
                      name={isVideoPlaying && index === currentVideoIndex ? 'pause' : 'play-arrow'}
                      size={42}
                      color="#FFFFFF"
                    />
                  </View>
                )}

                <View style={styles.videoProgressBarContainer}>
                  <View
                    style={[
                      styles.videoProgressBarFill,
                      { width: `${((currentVideoIndex + 1) / Math.max(videoReels.length, 1)) * 100}%` },
                    ]}
                  />
                </View>

              {/* Content Overlay */}
              {/* <View style={styles.reelContentStack}>
                <View style={styles.contentWrapper}>
                  <Animated.View style={[styles.reelInfoCardFloating, { opacity: scrollOpacity }]}> 
                    <TouchableOpacity style={styles.reelHighlightButton}>
                      <MaterialIcons name="play-circle-fill" size={18} color="#FFFFFF" />
                      <Text style={styles.reelHighlightText}>REEL HIGHLIGHT</Text>
                    </TouchableOpacity>

                    <Text style={styles.reelTitle}>{item.title}</Text>

                    <View style={styles.reelMeta}>
                      <Text style={styles.reelDuration}>{item.duration}</Text>
                      <Text style={styles.reelDot}>•</Text>
                      <Text style={styles.reelState}>State: {item.state}</Text>
                    </View>

                    <Text style={styles.reelDescription}>{item.description}</Text>

                    <Text style={styles.swipeHint}>Swipe up or down to browse reels</Text>
                  </Animated.View>
                </View>
              </View> */}

              <View style={styles.pageIndicatorOverlay}>
                <MaterialIcons name="arrow-upward" size={18} color="#FFFFFF" style={styles.pageArrow} />
                <Text style={styles.pageNumber}>{index + 1}/{videoReels.length}</Text>
                <MaterialIcons name="arrow-downward" size={18} color="#FFFFFF" style={styles.pageArrow} />
              </View>
            </Pressable>
          )}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
          />
        </View>
      ) : (
        // E-PAPER ARTICLES TAB
        <>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC143C" />
            </View>
          ) : (
            <FlatList
              ListHeaderComponent={
                <View style={styles.filtersContainer}>
                  {/* Language Platform Section */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Language Platform</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterButtons}
                    >
                      {languages.map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.filterButton,
                            selectedLanguage === lang && styles.filterButtonActive,
                          ]}
                          onPress={() => setSelectedLanguage(lang)}
                        >
                          <Text
                            style={[
                              styles.filterButtonText,
                              selectedLanguage === lang && styles.filterButtonTextActive,
                            ]}
                          >
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Geographical Region Section */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Geographical Region (States of India)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterButtons}
                    >
                      {states.map((state) => (
                        <TouchableOpacity
                          key={state}
                          style={[
                            styles.filterButton,
                            selectedState === state && styles.filterButtonActive,
                          ]}
                          onPress={() => setSelectedState(state)}
                        >
                          <Text
                            style={[
                              styles.filterButtonText,
                              selectedState === state && styles.filterButtonTextActive,
                            ]}
                          >
                            {state}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              }
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
        </>
      )}
<Modal
  visible={showCoinModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={styles.rewardModal}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.rewardTitle}>🎉 Recharge Reward</Text>

        <TouchableOpacity onPress={() => setShowCoinModal(false)}>
          <MaterialIcons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.rewardText}>
        Your mobile recharge will be done in{" "}
        <Text style={styles.highlightText}>50 days</Text>. Enter your
        mobile number to participate.
      </Text>

      {/* Mobile Number Input */}
      <TextInput
        placeholder="Mobile number"
        keyboardType="phone-pad"
        style={styles.mobileInput}
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={() => {
          // Submit logic here
          setShowCoinModal(false);
        }}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  </View>
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
    paddingTop: 50,
    paddingBottom: 0,
    paddingHorizontal: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tabNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  logo: {
    fontSize: 18,
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
    padding: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
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
  videoContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  videoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  videoPlaceholderSub: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  rewardModal: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  rewardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },

  rewardText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 20,
  },

  highlightText: {
    color: "#D90429",
    fontWeight: "700",
  },

  mobileInput: {
    height: 60,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: "#fff",
  },

  submitButton: {
    height: 58,
    borderRadius: 10,
    backgroundColor: "#D90429",
    justifyContent: "center",
    alignItems: "center",
  },

  submitButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  filtersContainer: {
    backgroundColor: '#F5F5F5',
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC143C',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  filterButtons: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  filterButtonActive: {
    backgroundColor: '#DC143C',
    borderColor: '#DC143C',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  videoReelsContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  reelFullScreen: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  videoBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  reelContentStack: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    zIndex: 10,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  reelInfoCardFloating: {
    paddingHorizontal: 4,
    paddingVertical: 20,
    borderRadius: 16,
  },
  pageIndicatorOverlay: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -30 }],
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 16,
  },
  pageArrow: {
    marginVertical: 4,
  },
  reelContainer: {
    height: 800,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 200,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButtonOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 4,
    margin: 0,
    padding: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoProgressBarFill: {
    height: '100%',
    width: '100%',
    margin: 0,
    padding: 0,
    backgroundColor: '#DC143C',
  },
  reelInfoCard: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  reelHighlightButton: {
    backgroundColor: '#DC143C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  reelHighlightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  reelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 28,
  },
  reelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reelDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: '#AAAAAA',
    backgroundColor: '#333333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reelDot: {
    color: '#AAAAAA',
    marginHorizontal: 8,
    fontSize: 16,
  },
  reelState: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  reelDescription: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 16,
  },
  swipeHint: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  pageIndicator: {
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollIndicators: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
  },
  scrollText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginVertical: 4,
  },
});

