import numpy as np
import random
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split

inputSize = 784
hiddenSize = 256
outputSize = 10

alpha = 0.001
epochs = 15
batchSize = 50

import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split
import random

alpha = 0.001
epochs = 15
batchSize = 50

inputSize = 784
hiddenSize = 128
outputSize = 10

def activation_relu(t):
    return np.maximum(t, 0)
def derivative_relu(t):
    return (t >= 0).astype(float)

def softmax_batch(t):
    out = np.exp(t)
    return out / np.sum(out, axis=1, keepdims=True)

def sparse_cross_entropy_batch(z, y):
    return -np.log(np.array([z[j, y[j]] for j in range(len(y))]))

def to_full_batch(y, num_classes):
    y_full = np.zeros((len(y), num_classes))
    for j, yj in enumerate(y):
        y_full[j, yj] = 1
    return y_full

#sklearn
mnist = fetch_openml('mnist_784', version=1, as_frame=False)
x, y = mnist["data"], mnist["target"]

x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)

x_train = np.array(x_train, dtype='float32') / 255
x_test = np.array(x_test, dtype='float32') / 255
y_train = np.array(y_train, dtype='int')
y_test = np.array(y_test, dtype='int')

dataset = [(x_train[i][None, ...], y_train[i]) for i in range(len(y_train))]

W1 = np.random.rand(inputSize, hiddenSize)
b1 = np.random.rand(1, hiddenSize)
W2 = np.random.rand(hiddenSize, outputSize)
b2 = np.random.rand(1, outputSize)

W1 = (W1 - 0.5) * 2 * np.sqrt(1/inputSize)
b1 = (b1 - 0.5) * 2 * np.sqrt(1/inputSize)
W2 = (W2 - 0.5) * 2 * np.sqrt(1/hiddenSize)
b2 = (b2 - 0.5) * 2 * np.sqrt(1/hiddenSize)

lossArr = []
for ep in range(epochs):
    print(f"Эпоха: {ep + 1}/{epochs}")  
    random.shuffle(dataset)
    for i in range(len(dataset) // batchSize):

        batch_x, batch_y = zip(*dataset[i*batchSize : i * batchSize + batchSize])
        x = np.concatenate(batch_x, axis=0)
        y = np.array(batch_y)

        #прямое распр
        t1 = x @ W1 + b1
        h1 = activation_relu(t1)
        t2 = h1 @ W2 + b2
        z = softmax_batch(t2)
        E = np.sum(sparse_cross_entropy_batch(z, y))

        #обратное распр
        y_full = to_full_batch(y, outputSize)
        dE_dt2 = z - y_full
        dE_dW2 = h1.T @ dE_dt2
        dE_db2 = np.sum(dE_dt2, axis=0, keepdims=True)
        dE_dh1 = dE_dt2 @ W2.T
        dE_dt1 = dE_dh1 * derivative_relu(t1)
        dE_dW1 = x.T @ dE_dt1
        dE_db1 = np.sum(dE_dt1, axis=0, keepdims=True)

        #обновляю веса
        W1 = W1 - alpha * dE_dW1
        b1 = b1 - alpha * dE_db1
        W2 = W2 - alpha * dE_dW2
        b2 = b2 - alpha * dE_db2

        lossArr.append(E)

def model_predict(x):
    t1 = x @ W1 + b1
    h1 = activation_relu(t1)
    t2 = h1 @ W2 + b2
    z = softmax_batch(t2)
    return z

def calculate_accuracy():
    correct = 0
    for x, y in dataset:
        z = model_predict(x)
        y_pred = np.argmax(z)
        if y_pred == y:
            correct += 1
    acc = correct / len(dataset)
    return acc

accuracy = calculate_accuracy()
print("Точность:", accuracy)

np.savetxt('W1.txt', W1)
np.savetxt('b1.txt', b1)
np.savetxt('W2.txt', W2)
np.savetxt('b2.txt', b2)


