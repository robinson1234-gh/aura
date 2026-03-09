"""
Three-Layer Convolutional Neural Network (CNN) in PyTorch

This implementation demonstrates a classic 3-layer CNN architecture
suitable for image classification tasks like CIFAR-10 (32x32 RGB images).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ThreeLayerCNN(nn.Module):
    """
    A 3-layer Convolutional Neural Network for image classification.
    
    Architecture:
    - Input: (batch_size, 3, 32, 32) - RGB images of size 32x32
    - Conv1: 32 filters, 3x3 kernel, ReLU activation, MaxPool 2x2
    - Conv2: 64 filters, 3x3 kernel, ReLU activation, MaxPool 2x2  
    - Conv3: 128 filters, 3x3 kernel, ReLU activation, MaxPool 2x2
    - FC1: Fully connected layer with 512 neurons + ReLU + Dropout
    - FC2: Output layer with 10 classes (for CIFAR-10)
    
    After 3 max pooling layers (each 2x2), the spatial dimensions become:
    32 -> 16 -> 8 -> 4, so final feature map is 4x4x128 = 2048 features
    """
    
    def __init__(self, num_classes=10):
        """
        Initialize the 3-layer CNN.
        
        Args:
            num_classes (int): Number of output classes (default: 10 for CIFAR-10)
        """
        super(ThreeLayerCNN, self).__init__()
        
        # First convolutional block
        # Input: (3, 32, 32) -> Output: (32, 16, 16)
        self.conv1 = nn.Conv2d(
            in_channels=3,      # RGB input channels
            out_channels=32,    # 32 feature maps
            kernel_size=3,      # 3x3 kernel
            padding=1           # Maintain spatial dimensions before pooling
        )
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2)  # 2x2 max pooling
        
        # Second convolutional block  
        # Input: (32, 16, 16) -> Output: (64, 8, 8)
        self.conv2 = nn.Conv2d(
            in_channels=32,
            out_channels=64,
            kernel_size=3,
            padding=1
        )
        self.pool2 = nn.MaxPool2d(kernel_size=2, stride=2)
        
        # Third convolutional block
        # Input: (64, 8, 8) -> Output: (128, 4, 4)
        self.conv3 = nn.Conv2d(
            in_channels=64,
            out_channels=128,
            kernel_size=3,
            padding=1
        )
        self.pool3 = nn.MaxPool2d(kernel_size=2, stride=2)
        
        # Fully connected layers
        # After 3 pooling layers: 32x32 -> 16x16 -> 8x8 -> 4x4
        # With 128 channels: 128 * 4 * 4 = 2048 input features
        self.fc1 = nn.Linear(128 * 4 * 4, 512)
        self.dropout = nn.Dropout(0.5)  # Dropout for regularization
        self.fc2 = nn.Linear(512, num_classes)
        
    def forward(self, x):
        """
        Forward pass through the network.
        
        Args:
            x (torch.Tensor): Input tensor of shape (batch_size, 3, 32, 32)
            
        Returns:
            torch.Tensor: Output logits of shape (batch_size, num_classes)
        """
        # First conv block: Conv -> ReLU -> MaxPool
        x = self.pool1(F.relu(self.conv1(x)))  # (batch, 32, 16, 16)
        
        # Second conv block: Conv -> ReLU -> MaxPool  
        x = self.pool2(F.relu(self.conv2(x)))  # (batch, 64, 8, 8)
        
        # Third conv block: Conv -> ReLU -> MaxPool
        x = self.pool3(F.relu(self.conv3(x)))  # (batch, 128, 4, 4)
        
        # Flatten for fully connected layers
        # (batch, 128, 4, 4) -> (batch, 128*4*4) = (batch, 2048)
        x = x.view(-1, 128 * 4 * 4)
        
        # Fully connected layers
        x = F.relu(self.fc1(x))    # (batch, 512)
        x = self.dropout(x)        # Apply dropout
        x = self.fc2(x)            # (batch, num_classes)
        
        return x


def main():
    """
    Example usage of the ThreeLayerCNN.
    Demonstrates model instantiation, forward pass, and basic info.
    """
    # Create model instance
    model = ThreeLayerCNN(num_classes=10)
    
    # Print model architecture
    print("=== Three-Layer CNN Architecture ===")
    print(model)
    print()
    
    # Calculate total parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    print()
    
    # Example forward pass
    batch_size = 4
    input_tensor = torch.randn(batch_size, 3, 32, 32)  # Random RGB images
    print(f"Input shape: {input_tensor.shape}")
    
    with torch.no_grad():  # No gradient computation for inference
        output = model(input_tensor)
    
    print(f"Output shape: {output.shape}")
    print(f"Sample predictions (logits): {output[0][:5]}")  # First 5 class logits
    
    # Show intermediate shapes (uncomment to see detailed flow)
    print("\n=== Layer-by-layer shape progression ===")
    x = input_tensor
    print(f"Input: {x.shape}")
    
    x = model.pool1(F.relu(model.conv1(x)))
    print(f"After Conv1 + Pool1: {x.shape}")
    
    x = model.pool2(F.relu(model.conv2(x)))
    print(f"After Conv2 + Pool2: {x.shape}")
    
    x = model.pool3(F.relu(model.conv3(x)))
    print(f"After Conv3 + Pool3: {x.shape}")
    
    x = x.view(-1, 128 * 4 * 4)
    print(f"After flattening: {x.shape}")


if __name__ == "__main__":
    main()