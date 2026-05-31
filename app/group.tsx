import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { createGroup, joinGroup, getActiveGroupId } from "../services/auth";

export default function GroupScreen() {
  const { profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const activeGroupId = getActiveGroupId(profile);

  const handleCreate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const groupId = await createGroup(profile.uid);
      await refreshProfile();
      Alert.alert(
        "Grupo criado! 🎉",
        `Código do grupo: ${groupId}\n\nCompartilhe com sua namorada para ela entrar.`,
        [{ text: "OK" }],
      );
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!profile) return;
    if (!code.trim()) {
      Alert.alert("Atenção", "Digite o código do grupo.");
      return;
    }
    setLoading(true);
    try {
      await joinGroup(profile.uid, code.trim().toUpperCase());
      await refreshProfile();
      Alert.alert("Sucesso! 🎉", "Você entrou no grupo!");
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!activeGroupId) return;
    try {
      await Share.share({
        message: `Entre no meu grupo de gastos! Código: ${activeGroupId}`,
      });
    } catch {}
  };

  const renderJoinSection = () => (
    <>
      <Text style={styles.label}>Entrar com código</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: ABC123"
        placeholderTextColor="#666"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity
        style={styles.joinBtn}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#1A1A2E" />
        ) : (
          <Text style={styles.joinBtnText}>Entrar no grupo</Text>
        )}
      </TouchableOpacity>
    </>
  );

  if (activeGroupId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>👥</Text>
          <Text style={styles.title}>Seu Grupo</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Código do grupo</Text>
            <Text style={styles.code}>{activeGroupId}</Text>
            <Text style={styles.codeHint}>
              Compartilhe este código com quem quiser adicionar ao grupo
            </Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Compartilhar código</Text>
          </TouchableOpacity>

          <View style={styles.switchBox}>
            <Text style={styles.switchTitle}>Trocar de grupo</Text>
            <Text style={styles.switchText}>
              Se tiver outro código, você pode entrar em outro grupo.
            </Text>
            {!showJoin ? (
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setShowJoin(true)}
              >
                <Text style={styles.switchBtnText}>Inserir código</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.switchJoinBox}>{renderJoinSection()}</View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>💑</Text>
        <Text style={styles.title}>Configurar Grupo</Text>
        <Text style={styles.subtitle}>
          Crie um grupo ou entre no grupo de alguém para compartilhar os gastos
        </Text>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>✨ Criar novo grupo</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {renderJoinSection()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  content: { flex: 1, padding: 32, paddingTop: 40 },
  emoji: { fontSize: 56, textAlign: "center", marginBottom: 12 },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 32,
    lineHeight: 22,
  },
  createBtn: {
    backgroundColor: "#E94560",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#333" },
  dividerText: { color: "#666", fontSize: 14 },
  label: { color: "#888", fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#0F3460",
    marginBottom: 16,
  },
  joinBtn: {
    backgroundColor: "#4ECDC4",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  joinBtnText: { color: "#1A1A2E", fontWeight: "bold", fontSize: 16 },
  codeCard: {
    backgroundColor: "#16213E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 2,
    borderColor: "#E94560",
  },
  codeLabel: { color: "#888", fontSize: 13, marginBottom: 8 },
  code: {
    color: "#E94560",
    fontSize: 40,
    fontWeight: "bold",
    letterSpacing: 8,
  },
  codeHint: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4ECDC4",
    marginBottom: 20,
  },
  shareBtnText: { color: "#4ECDC4", fontWeight: "bold", fontSize: 15 },
  switchBox: {
    backgroundColor: "#16213E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  switchTitle: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  switchText: { color: "#888", fontSize: 12, marginTop: 6, marginBottom: 12 },
  switchBtn: {
    backgroundColor: "rgba(78,205,196,0.15)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  switchBtnText: { color: "#4ECDC4", fontWeight: "bold", fontSize: 13 },
  switchJoinBox: { marginTop: 12 },
});
