import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";


const COLORS = {
  primary: "#D32F2F",
  primaryDark: "#B71C1C",
  background: "#F7F8FA",
  white: "#FFFFFF",
  text: "#1F2937",
  subText: "#6B7280",
  border: "#F1F1F1",
};

const APP_NAME = "The Bharat Evolution";
const EMAIL = "sunilkumarn659@gmail.com";
const PHONE = "+91 8984040583";
const WEBSITE = "https://www.yournews.com";
const ADDRESS = "Bhubaneswar, Odisha, India";

const ContactCard = ({
  emoji,
  title,
  value,
  onPress,
}: {
  emoji: string;
  title: string;
  value: string;
  onPress?: () => void;
}) => (
    
  <TouchableOpacity
    activeOpacity={0.8}
    style={styles.card}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.iconContainer}>
      <Text style={styles.icon}>{emoji}</Text>
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>

    {onPress && <Text style={styles.arrow}>›</Text>}
  </TouchableOpacity>
);

export default function ContactUsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={COLORS.primary}
        barStyle="light-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>📰</Text>
          </View>

          <Text style={styles.heading}>Contact Us</Text>

          <Text style={styles.subHeading}>
            Have a question, suggestion or feedback?{"\n"}
            We'd love to hear from you.
          </Text>
        </View>

        {/* White Card */}
        <View style={styles.content}>
          <ContactCard
            emoji="🏢"
            title="Organization"
            value={APP_NAME}
          />

          <ContactCard
            emoji="📧"
            title="Email"
            value={EMAIL}
            onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
          />

          <ContactCard
            emoji="📞"
            title="Phone"
            value={PHONE}
            onPress={() => Linking.openURL(`tel:${PHONE}`)}
          />

          <ContactCard
            emoji="🌐"
            title="Website"
            value={WEBSITE}
            onPress={() => Linking.openURL(WEBSITE)}
          />

          <ContactCard
            emoji="📍"
            title="Address"
            value={ADDRESS}
          />

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Need Assistance?</Text>

            <Text style={styles.infoText}>
              For news corrections, content-related inquiries, copyright
              concerns, or technical support, please contact us using the
              information above.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.response}>
              ⏱ Response Time: Within 24–48 business hours
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push("/terms-and-conditions")}
          >
            <Text style={styles.menuIcon}>📄</Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Terms & Conditions</Text>
              <Text style={styles.menuSubtitle}>
                Read our terms of use
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push("/privacy-policy")}
          >
            <Text style={styles.menuIcon}>🔒</Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Text style={styles.menuSubtitle}>
                Learn how we protect your data
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push("/about-us")}
          >
            <Text style={styles.menuIcon}>ℹ️</Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>About Us</Text>
              <Text style={styles.menuSubtitle}>
                Know more about our organization
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Bottom Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.button}
            onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
          >
            <Text style={styles.buttonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 35,
    paddingBottom: 80,
    alignItems: "center",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  logoText: {
    fontSize: 36,
  },

  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.white,
  },

  subHeading: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 30,
  },

  content: {
    marginHorizontal: 20,
    marginTop: -50,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#FDECEC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  icon: {
    fontSize: 24,
  },

  cardTitle: {
    color: COLORS.subText,
    fontSize: 13,
    marginBottom: 3,
  },

  cardValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "600",
  },

  arrow: {
    fontSize: 28,
    color: COLORS.primary,
    marginLeft: 10,
  },

  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primaryDark,
    marginBottom: 10,
  },

  infoText: {
    color: COLORS.subText,
    lineHeight: 22,
    fontSize: 15,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },

  response: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 15,
  },

  button: {
    backgroundColor: COLORS.primary,
    marginTop: 28,
    marginBottom: 25,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },

  menuCard: {
  backgroundColor: "#FFF",
  borderRadius: 18,
  padding: 18,
  flexDirection: "row",
  alignItems: "center",
  marginTop: 14,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 3,
  },
  elevation: 4,
},

menuIcon: {
  fontSize: 24,
  marginRight: 16,
},

menuTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: COLORS.text,
},

menuSubtitle: {
  marginTop: 3,
  color: COLORS.subText,
  fontSize: 13,
},
});