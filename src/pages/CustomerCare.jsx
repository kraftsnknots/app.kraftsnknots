// CustomerCare.js
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import Header from '../components/Header';
import axios from "axios";

const db = getFirestore(getApp());
const authInstance = getAuth(getApp());

const MAX_MESSAGE_LENGTH = 1000;
const ADMIN_EMAIL = 'kraftsnknots@outlook.com';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// very permissive phone regex — adjust to your region if needed
const phoneRegex = /^[0-9()+\-\s]{7,20}$/;

export default function CustomerCare({ navigation }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });

    const [loading, setLoading] = useState(false);
    const [prefetching, setPrefetching] = useState(true);
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });

    useEffect(() => {
        let mounted = true;

        async function fetchUser() {
            try {

                const user = authInstance.currentUser;
                if (!user) {
                    setPrefetching(false);
                    return;
                }

                const userRef = doc(collection(db, 'users'), user.uid);
                const userSnap = await getDoc(userRef);
                if (!mounted) return;

                if (userSnap.exists) {
                    const data = userSnap.data() || {};
                    setForm((p) => ({
                        ...p,
                        name: data.name || p.name,
                        email: data.email || user.email || p.email,
                        phone: data.phone || p.phone,
                    }));
                }
                else {
                    // fallback to auth profile
                    setForm((p) => ({
                        ...p,
                        email: user.email || p.email,
                    }));
                }
            } catch (err) {
                console.warn('fetchUser error', err);
            } finally {
                if (mounted) setPrefetching(false);
            }
        }

        fetchUser();
        return () => {
            mounted = false;
        };
    }, []);

    const validateAll = () => {
        const newErrors = { name: '', email: '', phone: '', message: '' };
        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.email.trim()) newErrors.email = 'Email is required';
        else if (!emailRegex.test(form.email.trim()))
            newErrors.email = 'Invalid email address';
        if (!form.phone.trim()) newErrors.phone = 'Phone is required';
        else if (!phoneRegex.test(form.phone.trim()))
            newErrors.phone = 'Invalid phone number';
        if (!form.message.trim()) newErrors.message = 'Message cannot be empty';
        else if (form.message.trim().length > MAX_MESSAGE_LENGTH)
            newErrors.message = `Message exceeds ${MAX_MESSAGE_LENGTH} characters`;

        setErrors(newErrors);

        // valid if all empty
        return Object.values(newErrors).every((e) => e === '');
    };

    const handleChange = (key, value) => {
        if (key === 'message' && value.length > MAX_MESSAGE_LENGTH) {
            // prevent overflow
            return;
        }
        setForm((p) => ({ ...p, [key]: value }));
        // live inline validation
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const handleSubmit = async () => {
        if (!validateAll()) {
            return Alert.alert('Validation', 'Please fix form errors before submitting.');
        }

        const user = authInstance.currentUser;
        if (!user) {
            return Alert.alert('Not logged in', 'You must be signed in to send a message.');
        }

        setLoading(true);
        try {
            const formDetails = {
                userId: user.uid,
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                message: form.message.trim(),
                createdAt: serverTimestamp(),
            }
            await addDoc(collection(db, 'contactFormQueries'), formDetails);

            const formRes = await axios.post(
                "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/sendContactFormConfirmation",
                { formDetails: formDetails }
            );

            const successRes = formRes.data.success;

            if (successRes) {
                Alert.alert('Message sent', 'Your message has been received successfully. Our team will get back to you shortly.');
                setForm((p) => ({ ...p, message: '' }));
                setErrors({ name: '', email: '', phone: '', message: '' });
                navigation.goBack();
            }


        } catch (err) {
            console.error('send message error', err);
            Alert.alert('Submit failed', 'Failed to send message. Please try again later.');
        } finally {
            setLoading(false);
        }
    };


    const remaining = MAX_MESSAGE_LENGTH - form.message.length;
    const isFormValid =
        !prefetching &&
        form.name.trim().length > 0 &&
        emailRegex.test(form.email.trim()) &&
        phoneRegex.test(form.phone.trim()) &&
        form.message.trim().length > 0 &&
        form.message.trim().length <= MAX_MESSAGE_LENGTH;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <Header />
                <ScrollView
                    contentContainerStyle={styles.wrapper}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <Text style={styles.title}>Contact Us</Text>

                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={[styles.input, errors.name ? styles.inputError : null]}
                            placeholder="Your full name"
                            placeholderTextColor="#C0C0C0"
                            value={form.name}
                            editable={!prefetching}
                            onChangeText={(t) => handleChange('name', t)}
                            returnKeyType="next"
                            autoCapitalize="words"
                            accessibilityLabel="Name"
                        />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, errors.email ? styles.inputError : null]}
                            placeholder="you@example.com"
                            placeholderTextColor="#C0C0C0"
                            value={form.email}
                            onChangeText={(t) => handleChange('email', t)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!prefetching}
                            accessibilityLabel="Email"
                        />
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={[styles.input, errors.phone ? styles.inputError : null]}
                            placeholder="+1 (555) 123-4567"
                            placeholderTextColor="#C0C0C0"
                            value={form.phone}
                            onChangeText={(t) => handleChange('phone', t)}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            accessibilityLabel="Phone"
                        />
                        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.textArea, errors.message ? styles.inputError : null]}
                            placeholder="Write your message..."
                            placeholderTextColor="#C0C0C0"
                            value={form.message}
                            onChangeText={(t) => handleChange('message', t)}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                            accessibilityLabel="Message"
                        />
                        <View style={styles.rowBetween}>
                            {errors.message ? <Text style={styles.errorText}>{errors.message}</Text> : <View />}
                            <Text style={styles.charCounter}>
                                {form.message.length} / {MAX_MESSAGE_LENGTH}
                            </Text>
                        </View>
                        <View style={styles.btns}>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    !isFormValid || loading ? styles.buttonDisabled : null,
                                ]}
                                onPress={handleSubmit}
                                disabled={!isFormValid || loading}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: !isFormValid || loading }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Send Message</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.buttonBack}
                                onPress={() => navigation.goBack()}>
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonBackText}>Back</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.smallNote}>
                            If you have any questions, concerns, or feedback regarding our products or services, please don't hesitate to reach out to us using the form above. Our dedicated customer care team is here to assist you and ensure your satisfaction.
                        </Text>
                        <Text style={styles.smallNote}>
                            We aim to respond to all messages within 24-48 hours on business days.
                        </Text>
                        <Text style={styles.smallNote}>
                            If you have attachment to share or message longer than 1000 characters. Please email us directly at support@kraftsnknots.com.
                        </Text>
                        <Text style={styles.smallNote}>
                            Thank you for choosing Krafts & Knots.
                        </Text>
                    </View>


                </ScrollView>
            </KeyboardAvoidingView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        padding: 16,
        paddingTop: 32,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        // shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        // elevation for Android
        elevation: 6,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        color: '#333',
        marginTop: 8,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E6E6E6',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        backgroundColor: '#FBFBFB',
    },
    inputError: {
        borderColor: '#E74C3C',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#E6E6E6',
        borderRadius: 10,
        padding: 12,
        minHeight: 120,
        backgroundColor: '#FBFBFB',
        fontSize: 15,
    },
    charCounter: {
        fontSize: 12,
        color: '#666',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    btns: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    button: {
        width: '50%',
        marginTop: 8,
        backgroundColor: '#000',
        paddingVertical: 14,
        borderTopRightRadius: 35,
        borderBottomRightRadius: 35,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    buttonBack: {
        width: '50%',
        marginTop: 8,
        backgroundColor: '#eee',
        paddingVertical: 14,
        borderTopLeftRadius: 35,
        borderBottomLeftRadius: 35,
        alignItems: 'center',
    },
    buttonBackText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
    errorText: {
        color: '#E74C3C',
        fontSize: 12,
        marginTop: 6,
    },
    smallNote: {
        marginTop: 10,
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },
});
