import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>

      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.appName}>ArogyaConnect</Text>

      <Text style={styles.tagline}>
        Healthcare within reach
      </Text>

      <Text style={styles.question}>
        Who are you?
      </Text>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Patient</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>ASHA / ANM Worker</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Doctor</Text>
      </Pressable>

      <Text style={styles.languages}>
        मराठी  |  हिंदी  |  English
      </Text>

      <Text style={styles.security}>
        🔒 Secure & Private
      </Text>

      <Text style={styles.legal}>
        Privacy Policy  ·  Terms
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 70,
    height: 70,
    marginBottom: 16,
  },

  appName: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  tagline: {
    fontSize: 16,
    marginTop: 6,
    marginBottom: 50,
  },

  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },

  button: {
    width: '100%',
    maxWidth: 350,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },

  languages: {
    marginTop: 25,
    fontSize: 15,
  },

  security: {
    marginTop: 30,
    fontSize: 14,
  },

  legal: {
    marginTop: 12,
    fontSize: 12,
  },
});